/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	REST,
	Routes,
	Client,
	ApplicationCommand,
	PermissionFlagsBits
} from "discord.js";
import logger from "./logger.js";

export function removePermissionProperties(obj: any): any {
	// If obj is an array, map through its elements
	if (Array.isArray(obj)) {
		return obj.map((item) => removePermissionProperties(item));
	}

	// If obj is not an object or is null, return it as is
	if (typeof obj !== "object" || obj === null) {
		return obj;
	}

	// Create a new object to store cleaned properties
	const cleanedObj: any = {};

	// Iterate through object properties
	for (const [key, value] of Object.entries(obj)) {
		// Skip permission-related properties
		if (key === "perm" || key === "permission") {
			continue;
		}

		// Recursively clean nested objects/arrays
		cleanedObj[key] = removePermissionProperties(value);
	}

	return cleanedObj;
}

// One name per bit: discord.js keeps deprecated aliases (for example
// ManageEmojisAndStickers and ManageGuildExpressions share a bit), and the
// later entry is the current name.
const PERMISSION_NAMES_BY_BIT = new Map<bigint, string>(
	Object.entries(PermissionFlagsBits).map(([name, flag]) => [flag, name])
);

export function readablePermissionNames(permission: unknown): string[] {
	const values = Array.isArray(permission) ? permission : [permission];
	const names = new Set<string>();

	for (const value of values) {
		if (typeof value !== "bigint" && typeof value !== "number") continue;

		const bits = BigInt(value);
		if (bits === 0n) continue;

		for (const [flag, name] of PERMISSION_NAMES_BY_BIT) {
			if ((bits & flag) === flag) names.add(name);
		}
	}

	return [...names];
}

// Spreadable fragment: { permissions } when at least one bit is set, else {}.
export function readablePermissionField(permission: unknown): {
	permissions?: string[];
} {
	const names = readablePermissionNames(permission);
	return names.length > 0 ? { permissions: names } : {};
}

// Same walk as removePermissionProperties, but a "permission" is exported as
// a readable "permissions" array of PermissionFlagsBits names (never a bigint).
// Only meant for the commands.json export, never for the Discord sync.
export function withReadablePermissions(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => withReadablePermissions(item));
	}

	if (typeof obj !== "object" || obj === null) {
		return obj;
	}

	const cleanedObj: any = {};

	for (const [key, value] of Object.entries(obj)) {
		if (key === "perm") continue;

		if (key === "permission") {
			Object.assign(cleanedObj, readablePermissionField(value));
			continue;
		}

		cleanedObj[key] = withReadablePermissions(value);
	}

	return cleanedObj;
}

export async function synchronizeCommands(client: Client): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			const rest = new REST().setToken(
				process.env.BOT_TOKEN || client.config.discord.token
			);
			const appCmds = client.applicationsCommands.map((command) => ({
				name: command.name,
				type: command.type,
				integration_types: command.integration_types,
				contexts: command.contexts
			}));

			const slashCommands =
				client.commands?.map((command) => {
					const commandData = {
						name: command.name,
						name_localizations: command.name_localizations,
						type: command.type,
						description: command.description,
						description_localizations:
							command.description_localizations,
						options:
							removePermissionProperties(command.options) || [],
						integration_types: command.integration_types || [0],
						contexts: command.contexts || [0]
					};
					return commandData;
				}) || [];

			const allCommands = [...slashCommands, ...appCmds];

			logger.log(
				`${client.config.console.emojis.LOAD} >> Currently, ${client.commands?.size || 0} Slash Commands (/) are waiting for refreshing.`
					.white
			);
			logger.log(
				`${client.config.console.emojis.LOAD} >> Currently, ${client.applicationsCommands?.size || 0} application commands ([]) are waiting for refreshing.`
					.white
			);

			const data = await rest.put(
				Routes.applicationCommands(client.user?.id!),
				{ body: allCommands }
			);

			logger.log(
				`${client.config.console.emojis.OK} >> Currently, ${(data as unknown as ApplicationCommand<{}>[]).length} applications are now synchronized.`
					.white
			);

			resolve();
		} catch (error: any) {
			logger.err(error);
			reject(error);
		}
	});
}

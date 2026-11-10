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

import { Client, GuildMember, PermissionsBitField } from "discord.js";
import { GatewayLink } from "../../../../types/gateway_link.js";
import { blacklistTable } from "../../../Events/client/ready.js";
import {
	checkMemberCommandPermission,
	hasCommandPermissionRequirements
} from "../../functions/permissonsCalculator.js";
import { consumeCommandRateLimit } from "../../commandExecutor.js";
import { ActionDef, ActionError, ActionGroup, fail, Params } from "./types.js";
import { coreActions } from "./core.js";
import { communityActions } from "./community.js";
import { membersActions } from "./members.js";
import { moderationActions } from "./moderation.js";
import { musicActions } from "./music.js";
import { serverActions } from "./server.js";
import { ticketsActions } from "./tickets.js";

// Every action the dashboard can ask for. The gateway relays only the names
// of its own table (HorizonGateway `src/dash_actions.rs`): keep both in sync.
export const actions: ActionGroup = {
	...coreActions,
	...communityActions,
	...membersActions,
	...moderationActions,
	...musicActions,
	...serverActions,
	...ticketsActions
};

// Two groups defining the same name would silently shadow one another.
{
	const seen = new Set<string>();
	for (const group of [
		coreActions,
		communityActions,
		membersActions,
		moderationActions,
		musicActions,
		serverActions,
		ticketsActions
	]) {
		for (const name of Object.keys(group)) {
			if (seen.has(name))
				throw new Error(`duplicate gateway action ${name}`);
			seen.add(name);
		}
	}
}

function resolveCommand(client: Client, path: string) {
	return path.includes(" ")
		? client.subCommands.get(path)
		: client.commands.get(path);
}

// What `slashCommandHandler` + `commandExecutor` check before a command.
export async function authorize(
	client: Client,
	member: GuildMember,
	def: ActionDef,
	opts: { write?: boolean } = {}
): Promise<void> {
	if (await blacklistTable.get(`${member.id}.blacklisted`)) {
		fail("forbidden: you are blacklisted from the bot");
	}
	if (def.ownerOnly && member.id !== member.guild.ownerId) {
		fail("forbidden: only the server owner can do this");
	}
	if (!def.command) return;

	const target = resolveCommand(client, def.command);
	if (!target) fail(`command ${def.command} not found`);

	const { allowed, permissionData } = await checkMemberCommandPermission(
		member,
		def.command!
	);
	if (!allowed) {
		if (hasCommandPermissionRequirements(permissionData)) {
			fail(
				`forbidden: the server's permission rules don't let you use /${def.command}`
			);
		}
		const permission = (target as { permission?: bigint | null })
			.permission;
		if (permission && !member.permissions.has(permission)) {
			const name = new PermissionsBitField(permission)
				.toArray()
				.join(", ");
			fail(`forbidden: /${def.command} requires ${name}`);
		}
	}
	if (opts.write) await countUse(client, member, def.command!, target);
}

// A dashboard action that changes something counts as a use of its command:
// the guild's /commandlimit and the command's cooldown (same keys as
// commandExecutor, so the slash command and the dashboard share them).
async function countUse(
	client: Client,
	member: GuildMember,
	command: string,
	target: unknown
): Promise<void> {
	const left = await consumeCommandRateLimit(
		client,
		member.guild,
		member.id,
		command
	);
	if (left !== null) {
		fail(`rate limited: try again in ${Math.ceil(left / 1000)} s`);
	}
	const cooldown = (target as { cooldown?: number }).cooldown;
	if (
		cooldown &&
		(await client.func.helper.cooldown(member.id, command, cooldown))
	) {
		const last =
			(await client.func.helper.getCooldownTimestamp(
				member.id,
				command
			)) || 0;
		const wait = Math.max(0, cooldown - (Date.now() - last));
		fail(`cooldown: try again in ${Math.ceil(wait / 1000)} s`);
	}
}

export async function runAction(
	client: Client,
	event: GatewayLink.ActionEvent
): Promise<unknown> {
	const def = Object.hasOwn(actions, event.action)
		? actions[event.action]
		: undefined;
	if (!def) fail(`unknown action ${event.action}`);

	const guild = client.guilds.cache.get(event.guildId);
	if (!guild) fail("guild not in this shard");

	const actor = await guild!.members.fetch(event.actorId).catch(() => null);
	if (!actor) fail("forbidden: you are not a member of this server");

	await authorize(client, actor!, def!, { write: event.write === true });

	const lang = await client.func.getLanguageData(guild!.id);
	return def!.run({
		client,
		guild: guild!,
		actor: actor!,
		params: new Params(
			event.params && typeof event.params === "object" ? event.params : {}
		),
		lang
	});
}

export { ActionError };

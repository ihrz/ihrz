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
	ApplicationCommandType,
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	CommandInteractionOptionResolver,
	Interaction
} from "discord.js";
import path from "node:path";
import { rename } from "node:fs/promises";

import { BotEvent } from "../../../types/event.js";
import { sanitizeInteractionOptionValue } from "../../core/functions/sanitizeInteractionOptionValue.js";
import {
	SLASH_LOG_TABLE,
	SlashLogEntry,
	SlashLogStore,
	SlashLogTable
} from "../../core/modules/slashLogStore.js";

// The pre-database log file (one per machine, rewritten by every shard).
const LEGACY_LOG_FILE = path.join(
	process.cwd(),
	"src",
	"files",
	"slash.log.json"
);
const MAX_PREFIX_ARGS = 500;

let store: SlashLogStore | null = null;

function shardId(client: Client): string {
	return String(client.shard?.ids[0] ?? 0);
}

// One store per shard process, created on the first logged command.
export function commandLogs(client: Client): SlashLogStore {
	if (!store) {
		let table: Promise<SlashLogTable> | null = null;
		store = new SlashLogStore(
			() =>
				(table ??= client.db.table(
					SLASH_LOG_TABLE
				) as unknown as Promise<SlashLogTable>),
			shardId(client)
		);
		store.start();
		if (shardId(client) === "0") void migrateLegacyLog(store);
	}
	return store;
}

// Old entries: `command` was "/sub options" (the root name was missing) and
// no user id was kept. Moved once into the database, as shard 0's.
export function legacyEntry(raw: unknown): SlashLogEntry | null {
	if (!raw || typeof raw !== "object") return null;
	const old = raw as Record<string, unknown>;
	if (typeof old.timestamp !== "number" || typeof old.command !== "string") {
		return null;
	}

	const text = old.command.trim();
	const prefix = !text.startsWith("/");
	const tokens = text.replace(/^\//, "").split(" ");
	const firstOption = tokens.findIndex((token) => /^[\w-]+:"/.test(token));
	const split = firstOption === -1 ? tokens.length : firstOption;

	return {
		at: old.timestamp,
		guildId: String(old.guildId ?? ""),
		guildName: String(old.guildName ?? ""),
		channelId: String(old.channelId ?? ""),
		channelName: String(old.channelName ?? ""),
		userId: "",
		username: String(old.executorUsername ?? ""),
		command: prefix ? tokens[0] : tokens.slice(0, split).join(" "),
		options: (prefix ? tokens.slice(1) : tokens.slice(split))
			.join(" ")
			.slice(0, MAX_PREFIX_ARGS),
		type: prefix ? "prefix" : "chat"
	};
}

async function migrateLegacyLog(target: SlashLogStore): Promise<void> {
	const file = Bun.file(LEGACY_LOG_FILE);
	if (!(await file.exists())) return;

	try {
		const entries = ((await file.json()) as unknown[])
			.map(legacyEntry)
			.filter((entry): entry is SlashLogEntry => entry !== null);

		for (const entry of entries) target.add(entry);
		await target.forceFlush();
		await rename(LEGACY_LOG_FILE, `${LEGACY_LOG_FILE}.migrated`);
		logger.log(
			`Moved ${entries.length} command logs from src/files/slash.log.json to the database`
		);
	} catch (error) {
		logger.err(
			"Unable to move the old command logs to the database:",
			error
		);
	}
}

export function logPrefixCommand(
	client: Client,
	entry: Omit<SlashLogEntry, "type" | "at" | "options"> & { args: string[] }
): void {
	const { args, ...rest } = entry;
	commandLogs(client).add({
		...rest,
		at: Date.now(),
		options: args.join(" ").slice(0, MAX_PREFIX_ARGS),
		type: "prefix"
	});
}

// Last logs saved before exiting, but a database that does not answer must
// never hold the shutdown back.
const flushAndExit = async () => {
	await Promise.race([
		store?.forceFlush().catch(() => {}),
		new Promise((resolve) => setTimeout(resolve, 3_000))
	]);
	process.exit(0);
};
process.on("SIGINT", flushAndExit);
process.on("SIGTERM", flushAndExit);

const TYPES: Record<number, SlashLogEntry["type"]> = {
	[ApplicationCommandType.ChatInput]: "chat",
	[ApplicationCommandType.User]: "user",
	[ApplicationCommandType.Message]: "message"
};

export const event: BotEvent = {
	name: "interactionCreate",
	run: async (client: Client, interaction: Interaction) => {
		if (
			!interaction.isCommand() ||
			!interaction.guild?.channels ||
			interaction.user.bot
		)
			return;

		const options = (interaction as ChatInputCommandInteraction)
			.options as CommandInteractionOptionResolver;
		const optionsList: string[] = (
			(options as any)["_hoistedOptions"] ?? []
		).map(
			(element: { name: string; value: unknown }) =>
				`${element.name}:"${sanitizeInteractionOptionValue(element.name, element.value)}"`
		);

		const path = [interaction.commandName];
		if (interaction.isChatInputCommand()) {
			const group = interaction.options.getSubcommandGroup(false);
			const sub = interaction.options.getSubcommand(false);
			if (group) path.push(group);
			if (sub) path.push(sub);
		}

		commandLogs(client).add({
			at: Date.now(),
			guildId: interaction.guildId!,
			guildName: interaction.guild.name,
			channelId: interaction.channelId,
			channelName:
				(interaction.channel as BaseGuildTextChannel | null)?.name ??
				"",
			userId: interaction.user.id,
			username: interaction.user.username,
			command: path.join(" "),
			options: optionsList.join(" "),
			type: TYPES[interaction.commandType] ?? "chat"
		});
	}
};

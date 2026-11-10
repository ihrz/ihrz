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
	ActionRowBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	Client,
	ColorResolvable,
	EmbedBuilder,
	Guild,
	GuildMember,
	PermissionFlagsBits,
	User
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";

type Status = DatabaseStructure.SuggestionStatus;
type Suggestion = DatabaseStructure.Suggestion;

export type SuggestionAction = "accept" | "deny" | "reply" | "status";
export type SuggestionOutcome = "ok" | "not_found" | "already" | "missing";

const STATUS_COLORS: Record<Status, ColorResolvable> = {
	pending: "#4000ff",
	reviewing: "#f1c232",
	accepted: "#21744c",
	planned: "#3498db",
	implemented: "#8afe46",
	denied: "#f13b38"
};

const EMBED_FIELD_LIMIT = 25;
const EMBED_FIELD_VALUE_LIMIT = 1024;

const OUTCOME_KEYS = {
	accept: {
		not_found: "suggest_accept_not_found_db",
		already: "suggest_accept_already_replied",
		missing: "suggest_accept_command_error",
		ok: "suggest_accept_command_work"
	},
	deny: {
		not_found: "suggest_deny_not_found_db",
		already: "suggest_deny_already_replied",
		missing: "suggest_deny_command_error",
		ok: "suggest_deny_command_work"
	},
	reply: {
		not_found: "suggest_replynot_found_db",
		already: "suggest_reply_already_replied",
		missing: "suggest_reply_command_error",
		ok: "suggest_reply_command_work"
	},
	status: {
		not_found: "suggest_accept_not_found_db",
		already: "suggest_accept_already_replied",
		missing: "suggest_accept_command_error",
		ok: "suggest_status_command_work"
	}
} as const;

export function statusLabel(lang: LanguageData, status: Status): string {
	return lang[`suggest_status_${status}`];
}

// Denied and implemented suggestions are final. `replied` marks the ones
// closed before statuses existed.
export function isSuggestionClosed(data: Suggestion): boolean {
	if (data.status) {
		return data.status === "denied" || data.status === "implemented";
	}
	return data.replied === true;
}

export function canManageSuggestions(
	member: GuildMember,
	config: DatabaseStructure.SuggestSchema | null | undefined
): boolean {
	return (
		member.permissions.has(PermissionFlagsBits.Administrator) ||
		(!!config?.staffRole && member.roles.cache.has(config.staffRole))
	);
}

export function suggestionComponents(
	lang: LanguageData,
	code: string,
	data: Pick<Suggestion, "votes" | "status" | "replied">
): ActionRowBuilder<ButtonBuilder>[] {
	const closed = isSuggestionClosed(data as Suggestion);
	const votes = Object.values(data.votes ?? {});
	const voteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`suggestion-vote%up%${code}`)
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(client.iHorizon_Emojis.Yes)
			.setLabel(votes.filter((vote) => vote === "up").length.toString())
			.setDisabled(closed),
		new ButtonBuilder()
			.setCustomId(`suggestion-vote%down%${code}`)
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(client.iHorizon_Emojis.No)
			.setLabel(votes.filter((vote) => vote === "down").length.toString())
			.setDisabled(closed)
	);

	if (closed) return [voteRow];

	return [
		voteRow,
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`suggestion-action%accept%${code}`)
				.setStyle(ButtonStyle.Success)
				.setLabel(lang.suggest_status_accepted),
			new ButtonBuilder()
				.setCustomId(`suggestion-action%deny%${code}`)
				.setStyle(ButtonStyle.Danger)
				.setLabel(lang.suggest_status_denied),
			new ButtonBuilder()
				.setCustomId(`suggestion-action%reply%${code}`)
				.setStyle(ButtonStyle.Secondary)
				.setLabel(lang.suggest_button_reply)
		)
	];
}

export async function updateSuggestion(
	client: Client,
	guild: Guild,
	code: string,
	update: { status?: Status; reason?: string | null; moderator: User },
	lang: LanguageData
): Promise<{ outcome: SuggestionOutcome; messageId?: string }> {
	const path = `${guild.id}.SUGGESTION.${code}`;
	const data = (await client.db.get(path)) as Suggestion | null;
	if (!data) return { outcome: "not_found" };

	if (
		isSuggestionClosed(data) ||
		(update.status && data.status === update.status)
	) {
		return { outcome: "already" };
	}

	const config = (await client.db.get(
		`${guild.id}.SUGGEST`
	)) as DatabaseStructure.SuggestSchema | null;
	const channel = config
		? (guild.channels.cache.get(config.channel) as
				BaseGuildTextChannel | undefined)
		: undefined;
	const message = await channel?.messages.fetch(data.msgId).catch(() => null);
	if (!message?.embeds[0]) return { outcome: "missing" };

	const next: Suggestion = {
		...data,
		status: update.status ?? data.status,
		replied: update.status
			? update.status === "denied" || update.status === "implemented"
			: data.replied
	};
	const embed = new EmbedBuilder(message.embeds[0].data);
	const username = update.moderator.globalName || update.moderator.username;

	if (update.status) {
		embed
			.setColor(STATUS_COLORS[update.status])
			.setTitle(`[${statusLabel(lang, update.status)}] #${code}`);
	}

	if (update.reason) {
		if ((embed.data.fields?.length ?? 0) >= EMBED_FIELD_LIMIT) {
			embed.spliceFields(0, 1);
		}

		const fieldKey =
			update.status === "accepted"
				? lang.suggest_accept_embed_fields_to_put
				: update.status === "denied"
					? lang.suggest_deny_embed_fields_to_put
					: lang.suggest_reply_embed_fields_to_put;

		embed.addFields({
			name: fieldKey.replace("${authorUsername}", username),
			value: update.reason.slice(0, EMBED_FIELD_VALUE_LIMIT)
		});
	}

	const edited = await message
		.edit({
			embeds: [embed],
			// suggestions from before the buttons keep their reactions
			...(message.components.length > 0
				? { components: suggestionComponents(lang, code, next) }
				: {})
		})
		.then(() => true)
		.catch(() => false);
	if (!edited) return { outcome: "missing" };

	await client.db.set(path, next);

	const notice = update.status
		? lang.suggest_notify_status.replace(
				"${status}",
				statusLabel(lang, update.status)
			)
		: lang.suggest_notify_reply;
	await message.thread
		?.send(notice.replace("${authorId}", data.author))
		.catch(() => {});

	if (isSuggestionClosed(next)) {
		await message.thread?.setLocked(true).catch(() => {});
	}

	return { outcome: "ok", messageId: data.msgId };
}

export function suggestionOutcomeText(
	lang: LanguageData,
	guildId: string,
	channelId: string,
	action: SuggestionAction,
	result: { outcome: SuggestionOutcome; messageId?: string },
	status?: Status
): string {
	const text = lang[OUTCOME_KEYS[action][result.outcome]]
		.replace("${guildId}", guildId)
		.replace("${channelId}", channelId)
		.replace("${messageId}", result.messageId ?? "");

	return status ? text.replace("${status}", statusLabel(lang, status)) : text;
}

export interface SuggestionRow {
	code: string;
	data: Suggestion;
	up: number;
	down: number;
}

/** `/suggest list`: suggestions with their votes, best score first. */
export function suggestionRows(
	all: DatabaseStructure.SuggestionData | null | undefined,
	filter: Status | null
): SuggestionRow[] {
	return Object.entries(all ?? {})
		.map(([code, data]) => {
			const votes = Object.values(data.votes ?? {});
			const up = votes.filter((vote) => vote === "up").length;
			const down = votes.length - up;
			return { code, data, up, down };
		})
		.filter(({ data }) => !filter || (data.status ?? "pending") === filter)
		.sort((a, b) => b.up - b.down - (a.up - a.down));
}

/**
 * `/suggest delete`: deletes the message, then the suggestion. "missing" when
 * the message cannot be fetched (the suggestion is kept, as before).
 */
export async function deleteSuggestion(
	client: Client,
	guild: Guild,
	channelId: string,
	code: string
): Promise<"ok" | "not_found" | "missing"> {
	const path = `${guild.id}.SUGGESTION.${code}`;
	const data = (await client.db.get(path)) as Suggestion | null;
	if (!data) return "not_found";

	const channel = guild.channels.cache.get(channelId) as
		BaseGuildTextChannel | undefined;
	const message = await channel?.messages.fetch(data.msgId).catch(() => null);
	if (!message) return "missing";

	message.delete().catch(() => {});
	await client.db.delete(path);
	return "ok";
}

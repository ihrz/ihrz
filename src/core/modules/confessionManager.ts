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
	APIEmbed,
	ActionRowBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	Client,
	EmbedBuilder,
	Guild,
	Message,
	SnowflakeUtil
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { metasTable } from "../../Events/client/ready.js";
import { readSavedEmbed } from "../functions/embedHelper.js";

const CONFESSION_AUTHOR_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CONFESSION_MAX_STORED = 2000;

export type ConfessionButtonStyle = NonNullable<
	NonNullable<DatabaseStructure.ConfessionSchema["button"]>["style"]
>;

export const CONFESSION_BUTTON_STYLES: readonly ConfessionButtonStyle[] = [
	"primary",
	"secondary",
	"success",
	"danger"
];
export const CONFESSION_LABEL_MAX = 80;
export const CONFESSION_EMOJI_MAX = 64;

const BUTTON_STYLE: Record<ConfessionButtonStyle, ButtonStyle> = {
	primary: ButtonStyle.Primary,
	secondary: ButtonStyle.Secondary,
	success: ButtonStyle.Success,
	danger: ButtonStyle.Danger
};

const CUSTOM_EMOJI = /^<(a?):([A-Za-z0-9_]{2,32}):(\d{17,20})>$/;
// Pictographs, flags (regional indicators), keycaps, joined by ZWJ and
// variation selectors / skin tones: one or a few emojis, nothing else.
const UNICODE_EMOJI =
	/^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200D|\uFE0F|\u20E3)+$/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;

export interface CustomEmoji {
	animated: boolean;
	name: string;
	id: string;
}

/** `<:name:id>` / `<a:name:id>`, or null. */
export function parseCustomEmoji(value: unknown): CustomEmoji | null {
	if (typeof value !== "string") return null;
	const match = CUSTOM_EMOJI.exec(value);
	return match
		? { animated: match[1] === "a", name: match[2], id: match[3] }
		: null;
}

/** A unicode emoji (≤ 64 characters) or a custom emoji written as `<:name:id>`. */
export function isValidButtonEmoji(value: unknown): value is string {
	if (
		typeof value !== "string" ||
		!value ||
		value.length > CONFESSION_EMOJI_MAX
	)
		return false;
	if (parseCustomEmoji(value)) return true;
	return UNICODE_EMOJI.test(value) && PICTOGRAPHIC.test(value);
}

/** The bot can put a custom emoji on a button: one of the guild's or one of its own. */
export function botCanUseEmoji(
	client: Client,
	guild: Guild | null | undefined,
	id: string
): boolean {
	return (
		!!guild?.emojis.cache.has(id) ||
		!!client.application?.emojis.cache.has(id)
	);
}

export interface ConfessionButtonLook {
	label: string;
	/** Unicode text or a parsed custom emoji, null = no emoji. */
	emoji: string | CustomEmoji | null;
	style: ConfessionButtonStyle;
}

/**
 * The button as it is sent: a missing or bad label is the default one, a bad
 * style is "secondary", a bad emoji (or a custom one the bot cannot use) is
 * dropped so posting the panel never fails.
 */
export function normalizeConfessionButton(
	button: DatabaseStructure.ConfessionSchema["button"] | null | undefined,
	defaultLabel: string,
	canUseEmoji: (id: string) => boolean = () => false
): ConfessionButtonLook {
	const rawLabel =
		typeof button?.label === "string" ? button.label.trim() : "";
	const label =
		rawLabel.length >= 1 && rawLabel.length <= CONFESSION_LABEL_MAX
			? rawLabel
			: defaultLabel;
	const style = CONFESSION_BUTTON_STYLES.includes(
		button?.style as ConfessionButtonStyle
	)
		? (button!.style as ConfessionButtonStyle)
		: "secondary";

	let emoji: ConfessionButtonLook["emoji"] = null;
	const rawEmoji =
		typeof button?.emoji === "string" ? button.emoji.trim() : "";
	if (isValidButtonEmoji(rawEmoji)) {
		const custom = parseCustomEmoji(rawEmoji);
		if (!custom) emoji = rawEmoji;
		else if (canUseEmoji(custom.id)) emoji = custom;
	}

	return { label, emoji, style };
}

/** The look as Discord text, for previews: `<:name:id>` or the unicode emoji. */
export function emojiText(emoji: ConfessionButtonLook["emoji"]): string {
	if (!emoji) return "";
	if (typeof emoji === "string") return emoji;
	return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}

export function confessionButton(look: ConfessionButtonLook): ButtonBuilder {
	const button = new ButtonBuilder()
		.setStyle(BUTTON_STYLE[look.style])
		.setLabel(look.label)
		.setCustomId("new-confession-button");
	if (look.emoji) button.setEmoji(look.emoji);
	return button;
}

export interface ConfessionPanelPayload {
	embeds: (APIEmbed | EmbedBuilder)[];
	files: { attachment: string | Buffer<ArrayBuffer>; name: string }[];
	components: ActionRowBuilder<ButtonBuilder>[];
}

type MetaReader = (key: string) => Promise<unknown>;

/**
 * The confession panel: the embed saved under `config.embedId` (or the
 * default one when the code is absent, invalid or deleted) and the "new
 * confession" button with the stored label / emoji / style.
 */
export async function confessionPanelPayload(
	client: Client,
	guild: Guild,
	config: DatabaseStructure.ConfessionSchema | null | undefined,
	lang: LanguageData,
	readMeta: MetaReader = (key) => metasTable.get(key)
): Promise<ConfessionPanelPayload> {
	const look = normalizeConfessionButton(
		config?.button,
		lang.confession_panel_button_default_label,
		(id) => botCanUseEmoji(client, guild, id)
	);
	const components = [
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			confessionButton(look)
		)
	];

	const saved = config?.embedId
		? await readSavedEmbed(config.embedId, readMeta).catch(() => null)
		: null;
	if (saved) {
		return { embeds: [saved.embedSource], files: [], components };
	}

	const embed = new EmbedBuilder()
		.setColor("#ff05aa")
		.setFooter(await client.func.displayBotName.footerBuilder(guild.id))
		.setTimestamp()
		.setDescription(lang.confession_channel_panel_embed_desc);
	return {
		embeds: [embed],
		files: [
			await client.func.displayBotName.footerAttachmentBuilder(guild)
		],
		components
	};
}

// Posts the confession panel (stored appearance), shared by /confession
// panel and the dashboard. The caller stores `GUILD.CONFESSION.panel` from
// the returned message.
export async function sendConfessionPanel(
	client: Client,
	channel: BaseGuildTextChannel,
	lang: LanguageData,
	config: DatabaseStructure.ConfessionSchema | null | undefined
): Promise<Message> {
	const payload = await confessionPanelPayload(
		client,
		channel.guild,
		config,
		lang
	);
	return channel.send({
		...payload,
		allowedMentions: { parse: [] },
		enforceNonce: true,
		nonce: SnowflakeUtil.generate().toString()
	});
}

async function fetchPanelMessage(
	client: Client,
	guild: Guild,
	panel: DatabaseStructure.ConfessionSchema["panel"] | null | undefined
): Promise<Message | null> {
	if (!panel?.channelId || !panel.messageId) return null;
	const channel = guild.channels.cache.get(panel.channelId);
	if (!channel || !channel.isTextBased()) return null;
	const message = await channel.messages
		.fetch(panel.messageId)
		.catch(() => null);
	if (!message || !client.user || message.author.id !== client.user.id)
		return null;
	return message;
}

/**
 * Edits the posted panel (`GUILD.CONFESSION.panel`) with the stored
 * appearance. False when there is no panel, it was deleted, it is not the
 * bot's message or the edit failed; never throws.
 */
export async function refreshConfessionPanel(
	client: Client,
	guild: Guild,
	readMeta?: MetaReader
): Promise<boolean> {
	try {
		const config = (await client.db.get(
			`${guild.id}.GUILD.CONFESSION`
		)) as DatabaseStructure.ConfessionSchema | null;
		const message = await fetchPanelMessage(client, guild, config?.panel);
		if (!message) return false;

		const lang = await client.func.getLanguageData(guild.id);
		const payload = await confessionPanelPayload(
			client,
			guild,
			config,
			lang,
			readMeta
		);
		return await message
			.edit({
				...payload,
				attachments: [],
				allowedMentions: { parse: [] }
			})
			.then(() => true)
			.catch(() => false);
	} catch {
		return false;
	}
}

/** Deletes a previous panel message if it is still there and the bot's. */
export async function deleteConfessionPanelMessage(
	client: Client,
	guild: Guild,
	panel: DatabaseStructure.ConfessionSchema["panel"] | null | undefined
): Promise<void> {
	const message = await fetchPanelMessage(client, guild, panel).catch(
		() => null
	);
	await message?.delete().catch(() => undefined);
}

export function isConfessionBanned(
	config: DatabaseStructure.ConfessionSchema | null | undefined,
	userId: string
): boolean {
	return config?.banned?.some((ban) => ban.userId === userId) ?? false;
}

// Forgets the author of old confessions and caps the stored list, which is
// read back in full on every click.
export async function pruneConfessions(
	client: Client,
	guildId: string
): Promise<void> {
	const path = `${guildId}.GUILD.CONFESSION.ALL_CONFESSIONS`;
	const list = (await client.db.get(path)) as
		DatabaseStructure.ConfessionSchema["ALL_CONFESSIONS"] | null;
	if (!list) return;

	const cutoff = Date.now() - CONFESSION_AUTHOR_RETENTION_MS;
	let changed = list.length > CONFESSION_MAX_STORED;
	const kept = list.slice(-CONFESSION_MAX_STORED).map((entry) => {
		if (!entry.userId || !entry.timestamp || entry.timestamp >= cutoff)
			return entry;

		changed = true;
		const { userId, ...anonymous } = entry;
		return anonymous;
	});

	if (changed) await client.db.set(path, kept);
}

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
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Guild,
	Message,
	SnowflakeUtil
} from "discord.js";

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes
} from "crypto";

import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

const CONFESSION_AUTHOR_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CONFESSION_MAX_STORED = 2000;

/**
 * The "author" button of a confession log carries who wrote it. The id is
 * sealed (AES-256-GCM, key derived from the bot secrets) so reading the
 * component payload of the log message does not reveal the author: only the
 * button handler, after its permission check, can open it.
 */
function authorSealKey(client: Client): Buffer {
	return createHash("sha256")
		.update(
			`confession-author:${client.config.api.apiToken}:${client.config.discord.token}`
		)
		.digest();
}

export function sealConfessionAuthor(client: Client, userId: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", authorSealKey(client), iv);
	const encrypted = Buffer.concat([
		cipher.update(userId, "utf8"),
		cipher.final()
	]);
	return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString(
		"base64url"
	);
}

export function openConfessionAuthor(
	client: Client,
	sealed: string
): string | null {
	try {
		const data = Buffer.from(sealed, "base64url");
		if (data.length < 12 + 16 + 1) return null;
		const decipher = createDecipheriv(
			"aes-256-gcm",
			authorSealKey(client),
			data.subarray(0, 12)
		);
		decipher.setAuthTag(data.subarray(data.length - 16));
		const userId = Buffer.concat([
			decipher.update(data.subarray(12, data.length - 16)),
			decipher.final()
		]).toString("utf8");
		return /^\d{17,20}$/.test(userId) ? userId : null;
	} catch {
		return null;
	}
}

// Confession panel (embed + "new confession" button), shared by
// /confession channel and the dashboard. The caller stores
// `GUILD.CONFESSION.panel` from the returned message.
export async function sendConfessionPanel(
	client: Client,
	channel: BaseGuildTextChannel,
	lang: LanguageData,
	buttonTitle: string,
	footerSource: ChatInputCommandInteraction<"cached"> | Message | Guild
): Promise<Message> {
	const embed = new EmbedBuilder()
		.setColor("#ff05aa")
		.setFooter(
			await client.func.displayBotName.footerBuilder(channel.guildId)
		)
		.setTimestamp()
		.setDescription(lang.confession_channel_panel_embed_desc);
	const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setLabel(buttonTitle)
			.setCustomId("new-confession-button")
	);

	return channel.send({
		embeds: [embed],
		files: [
			await client.func.displayBotName.footerAttachmentBuilder(
				footerSource
			)
		],
		components: [actionRow],
		enforceNonce: true,
		nonce: SnowflakeUtil.generate().toString()
	});
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

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

import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

const CONFESSION_AUTHOR_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CONFESSION_MAX_STORED = 2000;

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

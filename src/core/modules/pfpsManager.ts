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
	EmbedBuilder
} from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure";

async function PfpsManager_Init(client: Client) {
	Refresh(client);

	setInterval(() => {
		Refresh(client);
	}, 45_000);
}

async function Refresh(client: Client) {
	for (const guild of client.guilds.cache.values()) {
		const guildData = await client.db.get<DatabaseStructure.DbInId>(
			guild.id
		);
		if (!guildData?.PFPS) continue;
		if (guildData.PFPS.disable) continue;
		if (!guildData.PFPS.channel) continue;

		SendMessage(client, {
			guildId: guild.id,
			channelId: guildData.PFPS.channel
		});
	}
}

const usr: Record<string, string> = {};
async function SendMessage(
	client: Client,
	data: { guildId: string; channelId: string }
) {
	const guild = await client.guilds.fetch(data.guildId).catch(() => null);
	const channel = await guild?.channels
		.fetch(data.channelId)
		.catch(() => null);

	if (!guild || !channel) return;

	// Verify the cache has been initialized
	if (guild.members.cache.random()?.user.id === client.user?.id) {
		await guild.members.fetch();
	}

	let member = guild.members.cache.filter((user) => !user.user.bot).random();

	if (!member) return;

	const lang = await client.func.getLanguageData(guild.id);

	// Prevent the same before and after
	if (member.id === usr[data.guildId]) {
		usr[data.guildId] = member.id;
		member = guild.members.cache
			.filter((user) => user.id !== usr[data.guildId])
			.random()!;
	} else usr[data.guildId] = member.id;

	const actRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder();
	const ebds = [];

	const username = member.user.globalName || member.user.username;

	if (member.avatarURL() !== null) {
		let extension: "png" | "gif" = "png"; // by default is png
		if (member.avatar?.startsWith("a_")) extension = "gif";

		actRow.addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setURL(
					member
						.displayAvatarURL({ size: 4096, extension })
						.toString()
				)
				.setLabel(lang.pfps_download_guild_button)
		);

		ebds.push(
			new EmbedBuilder()
				.setColor("#a2add0")
				.setTitle(
					lang.pfps_embed_guild_title.replace("{username}", username!)
				)
				.setImage(member.displayAvatarURL({ extension, size: 4096 }))
		);
	}

	let extension: "png" | "gif" = "png"; // by default is png
	if (member.user.avatar?.startsWith("a_")) extension = "gif";

	actRow.addComponents(
		new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(member.user.displayAvatarURL({ extension, size: 4096 }))
			.setLabel(lang.pfps_download_user_button)
	);

	ebds.push(
		new EmbedBuilder()
			.setColor("#a2add0")
			.setTitle(
				lang.pfps_embed_user_title.replace("{username}", username!)
			)
			.setImage(member.user.displayAvatarURL({ extension, size: 4096 }))
			.setTimestamp()
			.setFooter(
				await client.func.displayBotName.footerBuilder(channel.guild.id)
			)
	);

	(channel as BaseGuildTextChannel).send({
		embeds: ebds,
		components: [actRow],
		files: [
			await client.func.displayBotName.footerAttachmentBuilder(
				channel.guild
			)
		]
	});
	return;
}

export { PfpsManager_Init };

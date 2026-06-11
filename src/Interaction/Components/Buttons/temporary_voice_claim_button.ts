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
	ButtonInteraction,
	ChannelType,
	EmbedBuilder,
	GuildMember
} from "discord.js";
import { tempTable } from "../../../Events/client/ready.ts";
import { DatabaseStructure } from "../../../../types/database_structure";

export default async function (interaction: ButtonInteraction<"cached">) {
	const result = (await interaction.client.db.get(
		`${interaction.guildId}.VOICE_INTERFACE`
	)) as DatabaseStructure.VoiceData | null | undefined;

	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const member = interaction.member as GuildMember;

	const targetedChannel = (interaction.member as GuildMember).voice.channel;
	const allChannel = await tempTable.get(
		`CUSTOM_VOICE.${interaction.guildId}`
	);

	if (!result || !allChannel) return await interaction.deferUpdate();
	if (result.interface?.channelId !== interaction.channelId)
		return await interaction.deferUpdate();

	let isTemporaryChannel = false;
	for (const [userId, channelId] of Object.entries(allChannel)) {
		if (channelId === targetedChannel?.id) {
			isTemporaryChannel = true;
			break;
		}
	}

	if (!isTemporaryChannel) return await interaction.deferUpdate();

	function getPreviousOwner(): { userId: string } {
		let userId = "";

		for (const [entryUserId, channelId] of Object.entries(allChannel)) {
			if (channelId !== targetedChannel?.id) continue;
			userId = entryUserId;
		}

		return {
			userId
		};
	}

	const previousOwner = getPreviousOwner();

	// Check if the previous owner is in their channel
	if (
		!previousOwner.userId ||
		targetedChannel?.members.get(previousOwner.userId)
	)
		return await interaction.deferUpdate();

	if (!member.voice.channel) {
		await interaction.deferUpdate();
		return;
	} else {
		// change ownership now
		const existingOwnedChannelId = (await tempTable.get(
			`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`
		)) as string | null | undefined;

		if (
			existingOwnedChannelId &&
			existingOwnedChannelId !== targetedChannel?.id
		) {
			const existingOwnedChannel =
				interaction.guild.channels.cache.get(existingOwnedChannelId) ||
				(await interaction.guild.channels
					.fetch(existingOwnedChannelId)
					.catch(() => null));

			if (
				existingOwnedChannel?.type === ChannelType.GuildVoice &&
				existingOwnedChannel.members.size > 0
			) {
				await interaction.deferUpdate();
				return;
			}

			await existingOwnedChannel?.delete().catch(() => {});
			await tempTable.delete(
				`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`
			);
		}

		await tempTable.delete(
			`CUSTOM_VOICE.${interaction.guildId}.${previousOwner.userId}`
		);
		await tempTable.set(
			`CUSTOM_VOICE.${interaction.guildId}.${interaction?.user?.id}`,
			targetedChannel?.id
		);
		let username =
			interaction.user.displayName || interaction.user.username;

		// change the voice channel name
		if (result?.voice_channel_name) {
			targetedChannel?.setName(
				result.voice_channel_name.includes("{Username}")
					? result.voice_channel_name.replace("{Username}", username!)
					: result.voice_channel_name + " " + username
			);
		} else
			targetedChannel?.setName(
				lang.temporary_voice_channel_name.replace(
					"{nickname}",
					`${username}`
				)
			);

		targetedChannel?.permissionOverwrites.delete(previousOwner.userId);

		targetedChannel?.permissionOverwrites.edit(interaction.user.id, {
			ViewChannel: true,
			Connect: true,
			Stream: true,
			Speak: true,

			SendMessages: true,
			UseApplicationCommands: true,
			AttachFiles: true,
			AddReactions: true
		});

		await interaction.reply({
			flags: [1 << 6],
			embeds: [
				new EmbedBuilder()
					.setDescription(lang.temporary_voice_title_embec)
					.setColor(2829617)
					.setFields(
						{
							name: lang.temporary_voice_new_member,
							value: `<@${interaction?.user?.id}>`
						},
						{
							name: lang.temporary_voice_old_member,
							value: `<@${previousOwner.userId}>`
						}
					)
					.setImage(
						await client.func.bannerGenerator(interaction.guild.id)
					)
					.setFooter(
						await interaction.client.func.displayBotName.footerBuilder(
							interaction.guildId!
						)
					)
			],
			files: [
				await interaction.client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			]
		});
	}
}

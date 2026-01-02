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

import { ActionRowBuilder, ButtonInteraction, ComponentType, EmbedBuilder, GuildMember, UserSelectMenuBuilder } from 'discord.js';
import { tempTable } from '../../../Events/client/ready.ts';

export default async function (interaction: ButtonInteraction<"cached">) {

	const result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
	const lang = await interaction.client.func.getLanguageData(interaction.guildId);
	const member = interaction.member as GuildMember;

	const targetedChannel = (interaction.member as GuildMember).voice.channel;
	const getChannelId = await tempTable.get(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);

	if (!result) return await interaction.deferUpdate();
	if (result.channelId !== interaction.channelId
		|| getChannelId !== targetedChannel?.id) return await interaction.deferUpdate();

	if (!member.voice.channel) {
		await interaction.deferUpdate()
		return;
	} else {

		const response = await interaction.reply({
			flags: [1 << 6],
			components: [
				new ActionRowBuilder<UserSelectMenuBuilder>()
					.addComponents(
						new UserSelectMenuBuilder()
							.setCustomId('temporary_voice_transfer_selectmenue')
							.setPlaceholder(lang.temporary_voice_transfer_menu_placeholder)
							.setMinValues(1)
							.setMaxValues(1)
					)
			]
		});

		const collector = interaction.channel?.createMessageComponentCollector({
			componentType: ComponentType.UserSelect,
			filter: (u) => u.user.id === interaction.user.id,
			time: 200_000
		});

		collector?.on('collect', async i => {
			// The new owner of the channel
			const newOwner = i.members.first();

			// change ownership now
			await tempTable.delete(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);
			await tempTable.set(`CUSTOM_VOICE.${interaction.guildId}.${newOwner?.user?.id}`, getChannelId)
			let username = interaction.user.displayName || interaction.user.username;

			// change the voice channel name
			if (result?.voice_channel_name) {
				targetedChannel?.setName(
					result.voice_channel_name.includes("{Username}") ?
						result.voice_channel_name.replace("{Username}", username!)
						: result.voice_channel_name + " " + username
				)
			} else targetedChannel?.setName(lang.temporary_voice_channel_name.replace("{nickname}", `${username}`));

			targetedChannel?.permissionOverwrites.delete(interaction.user.id);

			targetedChannel?.permissionOverwrites.edit(newOwner?.user?.id as string, {
				ViewChannel: true,
				Connect: true,
				Stream: true,
				Speak: true,

				SendMessages: true,
				UseApplicationCommands: true,
				AttachFiles: true,
				AddReactions: true
			});

			await i.reply({
				embeds: [
					new EmbedBuilder()
						.setDescription(lang.temporary_voice_title_embec)
						.setColor(2829617)
						.setFields(
							{
								name: lang.temporary_voice_new_member,
								value: `<@${newOwner?.user?.id}>`
							},
							{
								name: lang.temporary_voice_old_member,
								value: `<@${interaction.user.id}>`
							},
						)
						.setImage(await client.func.bannerGenerator(interaction.guildId))
						.setFooter(await interaction.client.func.displayBotName.footerBuilder(interaction.guildId!))
				],
				files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)],
				flags: [1 << 6]
			});

			collector?.stop();
		});

		collector?.on('end', i => {
			response.delete();
		})
	}
};
/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const player = client.player.getPlayer(interaction.guildId as string);

		if (!player) {
			await client.func.method.interactionSend(interaction, { content: lang.queue_iam_not_voicec });
			return;
		};

		// Check if the member is in the same voice channel as the bot
		if ((interaction.member as GuildMember).voice.channelId !== interaction.guild.members.me?.voice.channelId) {
			await client.func.method.interactionSend(interaction, {
				content: lang.music_cannot.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No),
			});
			return;
		}

		if (!player.queue.tracks) {
			await client.func.method.interactionSend(interaction, { content: lang.queue_no_queue });
			return;
		};

		const tracks = player.queue.tracks
			.map((track, idx) => `**${++idx})** [${track.info.title}](${track.info.uri})`)

		if (tracks.length === 0) {
			await client.func.method.interactionSend(interaction, { content: lang.queue_empty_queue });
			return;
		};

		const embeds: EmbedBuilder[] = [];
		const chunkSize = 10;
		let index = 0;
		while (tracks.length > 0) {
			const chunk = tracks.slice(0, chunkSize);
			const embed = new EmbedBuilder()
				.setColor('#ff0000')
				.setTitle(lang.queue_embed_title)
				.setDescription(chunk.join('\n') || lang.queue_embed_description_empty)
				.setFooter({
					text: lang.queue_embed_footer_text
						.replace("{index}", (index + 1).toString())
						.replace("{track}", player.queue.tracks.length.toString())
				});

			embeds.push(embed);
			tracks.splice(0, chunkSize);
			index++;
		};

		let currentIndex = 0;

		const createButtons = (currentIndex: number, totalPages: number) => {
			const row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('queue_previous')
						.setLabel('<<<')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentIndex === 0),
					new ButtonBuilder()
						.setCustomId('queue_next')
						.setLabel('>>>')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentIndex === totalPages - 1),
					new ButtonBuilder()
						.setCustomId('queue_close')
						.setEmoji('🗑️')
						.setStyle(ButtonStyle.Danger)
				);
			return row;
		};

		const components = embeds.length > 1 ? [createButtons(currentIndex, embeds.length)] : [];
		const message = await client.func.method.interactionSend(interaction, {
			embeds: [embeds[0]],
			components
		}) as Message;

		if (embeds.length === 1) return;

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i) => i.user.id === interaction.member?.user.id,
			time: 300000 // 5 minutes
		});

		collector.on('collect', async (i) => {
			switch (i.customId) {
				case 'queue_previous':
					if (currentIndex > 0) {
						currentIndex--;
					}
					break;
				case 'queue_next':
					if (currentIndex < embeds.length - 1) {
						currentIndex++;
					}
					break;
				case 'queue_close':
					collector.stop();
					return;
				default:
					return;
			}

			await i.update({
				embeds: [embeds[currentIndex]],
				components: [createButtons(currentIndex, embeds.length)]
			});
		});

		collector.on('end', () => {
			message.edit({ components: [] }).catch(() => { });
		});
	},
};
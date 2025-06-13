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
	Client,
	EmbedBuilder,
	ActionRowBuilder,
	ComponentType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	GuildMember,
	BaseGuildTextChannel,
	User,
	Message,
	AttachmentBuilder,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';
import getTopTwoColors from '../../../core/functions/image_dominant_color.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const pause = new ButtonBuilder()
			.setCustomId('pause')
			.setEmoji(client.iHorizon_Emojis.Pause)
			.setStyle(ButtonStyle.Secondary);

		const stop = new ButtonBuilder()
			.setCustomId('stop')
			.setEmoji(client.iHorizon_Emojis.Music_Stop)
			.setStyle(ButtonStyle.Secondary);

		const lyricsButton = new ButtonBuilder()
			.setCustomId('lyrics')
			.setEmoji(client.iHorizon_Emojis.Paper)
			.setStyle(ButtonStyle.Secondary);

		const btn = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(stop, pause, lyricsButton);

		const player = client.player.getPlayer(interaction.guildId as string);
		const voiceChannel = (interaction.member as GuildMember).voice.channel;

		if (!player || !player.playing || !voiceChannel) {
			await client.func.method.interactionSend(interaction, { content: lang.nowplaying_no_queue });
			return;
		};

		const progress = client.func.generateProgressBar(client.iHorizon_Emojis, player.position, player.queue.current?.info.duration!)

		let htmlContent = client.htmlfiles["nowPlaying"];
		const dominant_color = (await getTopTwoColors(player.queue.current?.info.artworkUrl as string)).split(" ");

		htmlContent = htmlContent.replace("{album_cover}", player.queue.current?.info.artworkUrl as string)
			.replace("{song_title}", player.queue.current?.info.title as string)
			.replace("{song_author}", player.queue.current?.info.author as string)
			.replace("{color1}", dominant_color[0])
			.replace("{color2}", dominant_color[1])
			.replace("{time0}", String((player.position / player.queue.current?.info.duration!) * 100))
			.replace("{time1}", progress.currentTime)
			.replace("{time2}", progress.totalTime);

		const image = await client.func.html2png(htmlContent, {
			omitBackground: true,
			selectElement: false,
		});

		const attachment = new AttachmentBuilder(image, { name: 'nowplaying.png' });

		const embed = new EmbedBuilder()
			.setTitle(`**${player.queue.current?.info.title}**, ${player.queue.current?.info?.author}`)
			.setURL(player.queue.current?.info?.uri || "")
			.setDescription(`by: ${(player.queue.current?.requester as User).toString()}`)
			.setColor("#6fa8dc")
			.setImage("attachment://nowplaying.png")

		const response = await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			components: [btn],
			files: [attachment]
		});

		let paused: boolean = false;
		const musicId = player.queue.current?.info.identifier;
		const collector = response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: player.queue.current?.info.duration! - player.position
		});

		const refresh_interval = setInterval((async () => {
			const player = client.player.getPlayer(interaction.guildId as string);

			if (player && player.playing && !paused && player.queue.current?.info.identifier === musicId) {
				const progress = client.func.generateProgressBar(client.emojis, player.position, player.queue.current?.info.duration!)
				const htmlContent = client.htmlfiles["nowPlaying"]
					.replace("{album_cover}", player.queue.current?.info.artworkUrl as string)
					.replace("{song_title}", player.queue.current?.info.title as string)
					.replace("{song_author}", player.queue.current?.info.author as string)
					.replace("{color1}", dominant_color[0])
					.replace("{color2}", dominant_color[1])
					.replace("{time0}", String((player.position / player.queue.current?.info.duration!) * 100))
					.replace("{time1}", progress.currentTime)
					.replace("{time2}", progress.totalTime);

				const image = await client.func.html2png(htmlContent, {
					omitBackground: true,
					selectElement: false,
				});

				const attachment = new AttachmentBuilder(image, { name: 'nowplaying.png' });

				const embed = new EmbedBuilder()
					.setTitle(`**${player.queue.current?.info.title}**, ${player.queue.current?.info?.author}`)
					.setURL(player.queue.current?.info?.uri || "")
					.setDescription(`by: ${(player.queue.current?.requester as User).toString()}`)
					.setColor("#6fa8dc")
					.setImage("attachment://nowplaying.png")

				response.edit({
					embeds: [embed],
					files: [attachment]
				});
			} else {
				clearInterval(refresh_interval);
			}
		}), 5900);

		collector.on('end', async () => {
			clearInterval(refresh_interval);
		});

		try {

			collector.on('collect', async (i) => {

				if (player || voiceChannel) {

					const channel = i.guild?.channels.cache.get(player.textChannelId as string);
					const requesterId = (player.queue.current?.requester as User).id

					if (i.user.id === requesterId) {
						switch (i.customId) {
							case "pause":
								await i.deferUpdate();
								if (paused) {
									player.resume();
									paused = false;
									(channel as BaseGuildTextChannel)?.send({ content: lang.nowplaying_resume_button.replace('${interaction.user}', interaction.member?.user.toString()!) });
								} else {
									player.pause();
									paused = true;
									(channel as BaseGuildTextChannel)?.send({ content: lang.nowplaying_pause_button.replace('${interaction.user}', interaction.member?.user.toString()!) });
								}
								break;
							case "lyrics":
								await i.deferReply({ flags: [1 << 6] });

								var lyrics = await client.lyricsSearcher.search(
									player.queue.current?.info?.title as string +
									player.queue.current?.info?.author as string
								).catch(() => {
									lyrics = null
								})

								if (!lyrics) {
									i.editReply({ content: lang.nowplaying_lyrics_button });
								} else {
									const trimmedLyrics = lyrics.lyrics.substring(0, 1997);
									const embed = new EmbedBuilder()
										.setTitle(player.queue.current?.info?.title as string)
										.setURL(player.queue.current?.info?.uri as string)
										.setTimestamp()
										.setThumbnail(lyrics.image)
										.setAuthor({
											name: player.queue.current?.info?.author as string,
										})
										.setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
										.setColor('#cd703a')
										.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));
									i.editReply({
										embeds: [embed],
										files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
									});
								};
								break;
							case "stop":
								if (!player || !player.playing || !voiceChannel) {
									await i.reply({ content: lang.nowplaying_no_queue, flags: [1 << 6] });
									return;
								};

								await i.deferUpdate();
								player.destroy();
								(channel as BaseGuildTextChannel).send({ content: lang.nowplaying_stop_buttom.replace('${interaction.user}', interaction.member?.user.toString()!) });
								break;
						}

					} else {
						await i.reply({ content: client.iHorizon_Emojis.No, flags: [1 << 6] });
					}
				}
			});

			collector.on('end', async (i) => {
				btn.components.forEach(x => {
					x.setDisabled(true)
				})
				await response.edit({ components: [] });
			});
		} catch {
			await client.func.method.channelSend(interaction, client.iHorizon_Emojis.Timer);
			return;
		};
	}
};
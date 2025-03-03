/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

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
	PermissionsBitField,
} from 'discord.js';
import WebSocket from 'ws';
import { forceJoinRestoreCord, getGuildDataPerSecretCode, SavedMembersRestoreCord } from '../../../core/functions/restoreCordHelper.js';
import { Command } from '../../../../types/command.js';

import { LanguageData } from '../../../../types/languageData.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const secretCode = interaction.options.getString("key")!;
		const table = client.db.table("RESTORECORD");
		const Data = getGuildDataPerSecretCode(await table.all(), secretCode);

		if (!Data) return client.func.method.interactionSend(interaction, {
			content: lang.rc_key_doesnt_exist
				.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
				.replace("${secretCode}", secretCode),
			ephemeral: true
		});

		const members = Data.data.members || [];
		const membersAlreadyHere = Data.data.members.filter(userId => {
			return interaction.guild.members.cache.has(userId)
		});

		let embed = new EmbedBuilder()
			.setTitle(lang.rc_forceJoin_embed_title)
			.setDescription(lang.rc_forceJoin_embed_desc)
			.setColor(2829617)
			.setFields(
				{ name: lang.rc_forceJoin_embed_field1, value: String(members.length), inline: true },
				{ name: lang.rc_forceJoin_embed_field2, value: String(membersAlreadyHere.length), inline: true },
				{ name: lang.rc_forceJoin_embed_field3, value: String(members.length - membersAlreadyHere.length), inline: true },
			);

		const response = await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			ephemeral: false,
			fetchReply: true,
			components: [
				new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder()
							.setCustomId("yes")
							.setStyle(ButtonStyle.Danger)
							.setLabel(lang.var_confirm),
						new ButtonBuilder()
							.setCustomId("no")
							.setStyle(ButtonStyle.Success)
							.setLabel(lang.embed_btn_cancel)
					)
			]
		});

		const collector = response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 2_240_00,
		});

		collector.on("collect", async i => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({ content: lang.help_not_for_you, ephemeral: true });
				return;
			}

			await i.deferUpdate();

			if (i.customId === "yes") {
				let totalMembers = Data.data.members.length;
				let addedCount = 0;
				let lastUpdateTime = Date.now();

				const updateEmbed = () => {
					embed.setFields(
						{ name: lang.rc_forceJoin_embed_2_field1, value: String(totalMembers - membersAlreadyHere.length), inline: true },
						{ name: lang.rc_forceJoin_embed_2_field2, value: String(addedCount), inline: true },
					);
					interaction.editReply({ embeds: [embed] });
				};

				const forceJoinMembers = Data.data.members.filter(userId => {
					return !interaction.guild.members.cache.has(userId)
				}).map(x => x);

				const updateInterval = 5;
				const maxUpdateInterval = 10000;

				forceJoinRestoreCord({
					membersToForceJoin: forceJoinMembers,
					apiToken: client.config.api.apiToken,
					targetGuildId: interaction.guildId,
					guildId: Data.id,
					secretCode
				}).then(res => {
					let data = res.message.split("%");
					let ws = new WebSocket(data[0]);

					ws.on('error', console.error);

					ws.on('open', function open() {
						ws.send("forceJoin%" + data[1]);
					});

					ws.on('message', async function message(messageData) {
						const messageParts = messageData.toString().split(":");
						const value = messageParts[1];
						const value2 = messageParts[2] || "";

						switch (value) {
							case "size":
								embed.setDescription(lang.rc_forceJoin_ws_size.replace("${value2}", value2));
								break;
							case "start":
								embed.setDescription(lang.rc_forceJoin_ws_start);
								break;
							case "add":
								addedCount++;
								if (Date.now() - lastUpdateTime > maxUpdateInterval || addedCount % updateInterval === 0) {
									updateEmbed();
									lastUpdateTime = Date.now();
								}
								break;
							case "end":
								embed.setDescription(lang.rc_forceJoin_ws_end);
								await interaction.followUp({
									content: lang.rc_forceJoin_ws_end_renew_msg
										.replace("${value2}", value2),
									ephemeral: true
								});

								await interaction.user.send(lang.rc_command_ok_dm.replace("${interaction.guild.name}", interaction.guild.name).replace("${res.secretCode}", value2))
									.catch(() => interaction.followUp({ content: lang.rc_command_dm_failed, ephemeral: true }))
									.then(() => interaction.followUp({ content: lang.rc_command_dm_ok, ephemeral: true }))
									;
								break;
						}
						updateEmbed();
					});

					ws.on("close", function () {
						ws.terminate();
					});
				});

				collector.stop();
			} else {
				await response.delete();
				collector.stop();
			}
		});

		collector.on("end", async () => {
			await interaction.editReply({ components: [] }).catch(() => false);
		});
	}
};
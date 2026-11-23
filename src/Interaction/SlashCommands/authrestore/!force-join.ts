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
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder
} from "discord.js";
import WebSocket from "ws";
import {
	forceJoinInBatches,
	getGuildDataPerSecretCode,
	sendKeyByDm
} from "../../../core/functions/authRestoreHelper.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const secretCode = interaction.options.getString("key")!;
		const Data = await getGuildDataPerSecretCode(secretCode);

		if (!Data)
			return client.func.method.interactionSend(interaction, {
				content: lang.rc_key_doesnt_exist
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${secretCode}", secretCode),
				flags: [1 << 6]
			});

		const members = Data.data.members || [];
		const membersAlreadyHere = members.filter((userId) => {
			return interaction.guild.members.cache.has(userId);
		});

		const embed = new EmbedBuilder()
			.setTitle(lang.rc_forceJoin_embed_title)
			.setDescription(lang.rc_forceJoin_embed_desc)
			.setColor(2829617)
			.setFields(
				{
					name: lang.rc_forceJoin_embed_field1,
					value: String(members.length),
					inline: true
				},
				{
					name: lang.rc_forceJoin_embed_field2,
					value: String(membersAlreadyHere.length),
					inline: true
				},
				{
					name: lang.rc_forceJoin_embed_field3,
					value: String(members.length - membersAlreadyHere.length),
					inline: true
				}
			);

		const response = await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			ephemeral: false,
			withResponse: true,
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
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
			time: 2_240_00
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			await i.deferUpdate();

			if (i.customId === "yes") {
				collector.stop();

				const forceJoinMembers = members.filter(
					(userId) => !interaction.guild.members.cache.has(userId)
				);
				// The gateway refuses an empty list: nothing would ever happen.
				if (!forceJoinMembers.length) {
					await interaction.editReply({
						embeds: [
							embed.setDescription(lang.rc_forcejoin_nobody)
						],
						components: []
					});
					return;
				}

				let addedCount = 0;
				let lastUpdateTime = 0;
				const updateEmbed = (force = false) => {
					if (!force && Date.now() - lastUpdateTime < 2_000) return;
					lastUpdateTime = Date.now();
					embed.setFields(
						{
							name: lang.rc_forceJoin_embed_2_field1,
							value: String(forceJoinMembers.length),
							inline: true
						},
						{
							name: lang.rc_forceJoin_embed_2_field2,
							value: String(addedCount),
							inline: true
						}
					);
					interaction
						.editReply({ embeds: [embed] })
						.catch(() => undefined);
				};

				const result = await forceJoinInBatches({
					members: forceJoinMembers,
					apiToken: client.config.api.apiToken,
					targetGuildId: interaction.guildId,
					guildId: Data.id,
					secretCode,
					openSocket: (url) => {
						const ws = new WebSocket(url);
						ws.on("error", (err) => logger.err(err));
						return ws;
					},
					onSize: (total) => {
						embed.setDescription(
							lang.rc_forceJoin_ws_size.replace(
								"${value2}",
								String(total)
							)
						);
						updateEmbed(true);
					},
					onStart: () => {
						embed.setDescription(lang.rc_forceJoin_ws_start);
						updateEmbed(true);
					},
					onAdd: () => {
						addedCount++;
						updateEmbed();
					}
				});

				if (result.error) {
					logger.err(`AuthRestore force-join: ${result.error}`);
				}
				embed.setDescription(
					result.error
						? result.renewed
							? lang.rc_forcejoin_stopped
							: lang.rc_forcejoin_failed
						: lang.rc_forceJoin_ws_end
				);
				updateEmbed(true);

				// The old key no longer works: hand over the new one.
				if (!result.renewed) return;
				await interaction.followUp({
					content: lang.rc_forceJoin_ws_end_renew_msg.replace(
						"${value2}",
						result.secretCode
					),
					flags: [1 << 6]
				});
				const keyGuildName =
					client.guilds.cache.get(Data.id)?.name ?? Data.id;
				await sendKeyByDm(
					() =>
						interaction.user.send(
							lang.rc_command_ok_dm
								.replace("${guildName}", keyGuildName)
								.replace("${secretCode}", result.secretCode)
						),
					(delivered) =>
						interaction.followUp({
							content: delivered
								? lang.rc_command_dm_ok
								: lang.rc_command_dm_failed,
							flags: [1 << 6]
						})
				);
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

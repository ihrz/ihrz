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
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	PermissionsBitField,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputStyle
} from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { LanguageData } from '../../../../types/languageData.js';
import { generateJoinImage } from '../../../Events/guildconfig/joinMessage.js';
import logger from '../../../core/logger.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

function isValidColor(color: string): boolean {
	return /^#([0-9a-f]{3}){1,2}$/i.test(color);
}

import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		let joinMessage = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`);
		let ImageBannerOptions = await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinbanner`) as DatabaseStructure.JoinBannerOptions | undefined;
		let ImageBannerStates = await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinbannerStates`) as string | undefined;
		let guildLocal = await client.db.get(`${interaction.guild.id}.GUILD.LANG.lang`) || "en-US";

		var backgroundURL = ImageBannerOptions?.backgroundURL || "https://img.freepik.com/vecteurs-libre/fond-courbe-bleue_53876-113112.jpg";
		var profilePictureRound = ImageBannerOptions?.profilePictureRound || "status";
		var textColour = ImageBannerOptions?.textColour || "#000000"
		var message = ImageBannerOptions?.message || lang.setjoinmessage_image_default_text;
		var textSize = ImageBannerOptions?.textSize || "40px";
		var avatarSize = ImageBannerOptions?.avatarSize || "140px";

		await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize })

		joinMessage = joinMessage?.substring(0, 1010);

		let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!;
		let helpembed_fields = [
			{
				name: lang.setjoinmessage_help_embed_fields_custom_name,
				value: joinMessage ? `\`\`\`${joinMessage}\`\`\`\n${client.func.method.generateCustomMessagePreview(joinMessage, {
					user: interaction.user,
					guild: interaction.guild!,
					guildLocal: guildLocal,
				})}` : lang.setjoinmessage_help_embed_fields_custom_name_empy
			},
			{
				name: lang.setjoinmessage_help_embed_fields_default_name_empy,
				value: `\`\`\`${lang.event_welcomer_inviter}\`\`\`\n${client.func.method.generateCustomMessagePreview(lang.event_welcomer_inviter, {
					user: interaction.user,
					guild: interaction.guild!,
					guildLocal: guildLocal,
				})}`
			}
		];

		var helpEmbed = new EmbedBuilder()
			.setColor("#ffb3cc")
			.setDescription(lang.setjoinmessage_help_embed_desc)
			.setTitle(lang.setjoinmessage_help_embed_title)
			.setFields(helpembed_fields);

		const helpEmbed2 = new EmbedBuilder()
			.setColor("#ffb3cc")
			.setTitle(lang.setjoinmessage_var_image_card)
			.setImage("attachment://image.png")

		const buttons = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId("joinMessage-set-message")
					.setLabel(lang.setjoinmessage_button_set_name)
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId("joinMessage-default-message")
					.setLabel(lang.setjoinmessage_buttom_del_name)
					.setStyle(ButtonStyle.Danger)
			);

		const buttons2 = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId("joinMessage-set-image")
					.setLabel(lang.setjoinmessage_change_image_button_title)
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId("joinMessage-default-image")
					.setLabel(lang.setjoinmessage_default_image_button_title)
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("joinMessage-delete-image")
					.setLabel(ImageBannerStates !== "off" ? lang.setjoinmessage_var_disable_image : lang.setjoinmessage_var_enable_image)
					.setStyle(ImageBannerStates !== "off" ? ButtonStyle.Danger : ButtonStyle.Success),
			);

		var embeds = [helpEmbed];
		var files = [];

		if (ImageBannerStates !== "off") embeds.push(helpEmbed2) && files.push(attachment)

		const message2 = await interaction.editReply({
			embeds: embeds,
			components: [buttons, buttons2],
			files: files
		});

		const collector = message2.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 8_00_000
		});

		collector.on('collect', async (buttonInteraction) => {
			if (buttonInteraction.user.id !== interaction.user.id) {
				await buttonInteraction.reply({ content: lang.help_not_for_you, flags: [1 << 6] });
				return;
			};

			if (buttonInteraction.customId === "joinMessage-set-message") {
				let modalInteraction = await iHorizonModalResolve({
					customId: 'joinMessage-modal',
					title: lang.setjoinmessage_awaiting_response,
					deferUpdate: false,
					fields: [
						{
							customId: 'joinMessage-input',
							label: lang.guildprofil_embed_fields_joinmessage,
							style: TextInputStyle.Paragraph,
							required: true,
							maxLength: 1010,
							minLength: 2
						},
					]
				}, buttonInteraction);

				if (!modalInteraction) return;

				try {
					const response = modalInteraction.fields.getTextInputValue('joinMessage-input');

					helpEmbed.setFields(
						{
							name: lang.setjoinmessage_help_embed_fields_custom_name,
							value: response ? `\`\`\`${response}\`\`\`\n${client.func.method.generateCustomMessagePreview(response, {
								user: interaction.user,
								guild: interaction.guild!,
								guildLocal: guildLocal,
							})}` : lang.setjoinmessage_help_embed_fields_custom_name_empy
						},
						helpembed_fields[1]
					);

					await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`, response);
					await modalInteraction.reply({
						content: lang.setjoinmessage_command_work_on_enable
							.replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
						flags: [1 << 6]
					});

					let emb = [helpEmbed]
					let files = [];

					if (ImageBannerStates === "on") emb.push(helpEmbed2) && files.push((await generateJoinImage(interaction.member as GuildMember, { backgroundURL: backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!);

					await message2.edit({ embeds: emb, files: files });

					await client.func.ihorizon_logs(interaction, {
						title: lang.setjoinmessage_logs_embed_title_on_enable,
						description: lang.setjoinmessage_logs_embed_description_on_enable
							.replace("${interaction.user.id}", interaction.user.id)
					});
				} catch (e) {
					logger.err(e as any);
				}
			} else if (buttonInteraction.customId === "joinMessage-default-message") {
				helpEmbed.setFields(
					{
						name: lang.setjoinmessage_help_embed_fields_custom_name,
						value: lang.setjoinmessage_help_embed_fields_custom_name_empy
					},
					helpembed_fields[1]
				);

				await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`);

				await buttonInteraction.reply({
					content: lang.setjoinmessage_command_work_on_enable
						.replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
					flags: [1 << 6]
				});

				let emb = [helpEmbed]
				let files = [];

				if (ImageBannerStates === "on") emb.push(helpEmbed2) && files.push((await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!);

				await message2.edit({ embeds: emb, files: files });

				await client.func.ihorizon_logs(interaction, {
					title: lang.setjoinmessage_logs_embed_title_on_disable,
					description: lang.setjoinmessage_logs_embed_description_on_disable
						.replace("${interaction.user.id}", interaction.user.id)
				});
			} else if (buttonInteraction.customId === "joinMessage-set-image") {
				await buttonInteraction.deferUpdate();

				let stringSelectMenu = new StringSelectMenuBuilder()
					.setCustomId("test")
					.addOptions(
						new StringSelectMenuOptionBuilder()
							.setLabel(lang.setjoinmessage_change_image_propreties_background)
							.setValue("change_background"),
						new StringSelectMenuOptionBuilder()
							.setLabel(lang.setjoinmessage_change_image_propreties_frame_color)
							.setValue("change_frame"),
						new StringSelectMenuOptionBuilder()
							.setLabel(lang.setjoinmessage_change_image_propreties_text_colour)
							.setValue("change_text_colour"),
						new StringSelectMenuOptionBuilder()
							.setLabel(lang.setjoinmessage_change_image_propreties_text_message)
							.setValue("change_text_message"),
						new StringSelectMenuOptionBuilder()
							.setLabel(lang.setjoinmessage_change_image_propreties_text_size)
							.setValue("change_text_size"),
						new StringSelectMenuOptionBuilder()
							.setLabel(lang.setjoinmessage_change_image_propreties_avatar_size)
							.setValue("change_avatar_size"),
					);

				let attachment = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringSelectMenu);

				let msg = await buttonInteraction.editReply({ components: [attachment] });

				let i1_collector = msg.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					time: 1_250_000,
					filter: (x) => x.user.id === interaction.user.id
				});

				i1_collector.on("collect", async (i1) => {
					if (i1.values[0] === "change_background") {
						let res = await iHorizonModalResolve({
							title: lang.setjoinmessage_change_image_propreties_background,
							customId: 'change_background',
							deferUpdate: true,
							fields: [
								{
									customId: 'url',
									label: lang.setjoinmessage_modal_fields_background_url,
									style: TextInputStyle.Short,
									required: true,
									maxLength: 300,
									minLength: 7
								}
							]
						}, i1);

						let choice = res?.fields.getTextInputValue("url")!;

						if (await interaction.client.func.image64.isImageUrl(res?.fields.getTextInputValue("url")!)) {
							let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL: choice, profilePictureRound, textColour, message, textSize, avatarSize }))!;
							backgroundURL = choice;
							await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] })
						} else {
							let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!;

							await interaction.editReply({
								embeds: [helpEmbed, helpEmbed2],
								content: "",
								components: [buttons, buttons2],
								files: [attachment]
							})
						}
						i1_collector.stop();
					} else if (i1.values[0] === "change_frame") {
						await i1.deferUpdate();

						let stringSelectMenu = new StringSelectMenuBuilder()
							.setCustomId("test")
							.addOptions(
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_change_image_menu_frame_color_profil)
									.setValue("hexProfileColor"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_change_image_menu_frame_status_profil)
									.setValue("status"),
							);

						let attachment = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringSelectMenu);

						let msg = await buttonInteraction.editReply({ components: [attachment] });

						let i = await msg.awaitMessageComponent({
							componentType: ComponentType.StringSelect,
							time: 1_250_000,
							filter: (x) => x.user.id === interaction.user.id
						});

						i.deferUpdate()

						profilePictureRound = (i.values[0] as typeof profilePictureRound);

						let attachment2 = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!;
						await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment2], components: [buttons, buttons2] })
						i1_collector.stop();
					} else if (i1.values[0] === "change_text_colour") {
						let res = await iHorizonModalResolve({
							title: lang.setjoinmessage_change_image_propreties_text_colour,
							customId: 'change_text_colour',
							deferUpdate: false,
							fields: [
								{
									customId: 'colour',
									label: lang.setjoinmessage_modal_fields_hex_color,
									style: TextInputStyle.Short,
									required: true,
									maxLength: 9,
									minLength: 3
								}
							]
						}, i1);


						textColour = res?.fields.getTextInputValue("colour")!;

						if (!isValidColor(textColour)) {
							res?.reply({ content: lang.embed_choose_12_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo) })
						}

						await res?.deferUpdate();

						let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!;
						await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] })
						i1_collector.stop();
					} else if (i1.values[0] === "change_text_message") {
						let res = await iHorizonModalResolve({
							title: lang.setjoinmessage_change_image_propreties_text_message,
							customId: 'change_text_message',
							deferUpdate: true,
							fields: [
								{
									customId: 'msg',
									label: lang.setjoinmessage_modal_fields_message,
									style: TextInputStyle.Short,
									required: true,
									maxLength: 100,
									minLength: 15
								}
							],
						}, i1);


						message = res?.fields.getTextInputValue("msg")!;

						let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!;
						await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] });
						i1_collector.stop();
					} else if (i1.values[0] === "change_text_size") {
						await i1.deferUpdate()

						let stringSelectMenu = new StringSelectMenuBuilder()
							.setCustomId("test")
							.addOptions(
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_text_size + "0.5")
									.setValue("20px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_text_size + "1")
									.setValue("40px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_text_size + "1.5")
									.setValue("60px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_text_size + "2")
									.setValue("80px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_text_size + "3")
									.setValue("120px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_text_size + "4")
									.setValue("160px"),
							);

						let attachment = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringSelectMenu);

						let msg = await buttonInteraction.editReply({ components: [attachment] });

						let i = await msg.awaitMessageComponent({
							componentType: ComponentType.StringSelect,
							time: 1_250_000,
							filter: (x) => x.user.id === interaction.user.id
						});

						i.deferUpdate()

						textSize = i.values[0];

						let attachment2 = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!;
						await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment2], components: [buttons, buttons2] });
						i1_collector.stop();
					} else if (i1.values[0] === "change_avatar_size") {
						await i1.deferUpdate()

						let stringSelectMenu = new StringSelectMenuBuilder()
							.setCustomId("test")
							.addOptions(
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_avatar_size + "0.5")
									.setValue("70px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_avatar_size + "1")
									.setValue("140px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_avatar_size + "1.5")
									.setValue("210px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_avatar_size + "2")
									.setValue("280px"),
								new StringSelectMenuOptionBuilder()
									.setLabel(lang.setjoinmessage_var_avatar_size + "3")
									.setValue("430px"),
							);

						let attachment = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringSelectMenu);

						let msg = await buttonInteraction.editReply({ components: [attachment] });

						let i = await msg.awaitMessageComponent({
							componentType: ComponentType.StringSelect,
							time: 1_250_000,
							filter: (x) => x.user.id === interaction.user.id
						});

						i.deferUpdate()

						avatarSize = i.values[0];

						let attachment2 = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize }))!;
						await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment2], components: [buttons, buttons2] });
						i1_collector.stop();
					};
				})

				await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize })
			} else if (buttonInteraction.customId === "joinMessage-default-image") {
				backgroundURL = "https://img.freepik.com/vecteurs-libre/fond-courbe-bleue_53876-113112.jpg";
				profilePictureRound = "status";
				textColour = "#000000"
				message = lang.setjoinmessage_image_default_text
				avatarSize = "140px"
				textSize = "40px"

				await buttonInteraction.deferUpdate();

				let attachment = (await generateJoinImage(interaction.member as GuildMember, { textSize, backgroundURL, profilePictureRound, textColour, message, avatarSize }))!;
				await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] });
				await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`, { backgroundURL, profilePictureRound, textColour, message, textSize, avatarSize })
			} else if (buttonInteraction.customId === "joinMessage-delete-image") {
				await buttonInteraction.deferUpdate();

				if (ImageBannerStates === "off") {
					let attachment = (await generateJoinImage(interaction.member as GuildMember, { textSize, backgroundURL, profilePictureRound, textColour, message, avatarSize }))!;
					await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbannerStates`, "on")
					ImageBannerStates = "on";

					buttons2.components[2].setStyle(ImageBannerStates !== "off" ? ButtonStyle.Danger : ButtonStyle.Success)
					buttons2.components[2].setLabel(ImageBannerStates !== "off" ? lang.setjoinmessage_var_disable_image : lang.setjoinmessage_var_enable_image)

					await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], components: [buttons, buttons2], files: [attachment] });
				} else {
					await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbannerStates`, "off")
					ImageBannerStates = "off"

					buttons2.components[2].setStyle(ImageBannerStates !== "off" ? ButtonStyle.Danger : ButtonStyle.Success)
					buttons2.components[2].setLabel(ImageBannerStates !== "off" ? lang.setjoinmessage_var_disable_image : lang.setjoinmessage_var_enable_image)

					await interaction.editReply({ embeds: [helpEmbed], components: [buttons, buttons2], files: [] });
				}
			}
		});

		collector.on('end', async () => {
			buttons.components.forEach(x => {
				x.setDisabled(true)
			})
			buttons2.components.forEach(x => {
				x.setDisabled(true)
			})
			await message2.edit({ components: [buttons, buttons2] });
		});
	},
};
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
	Client,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ComponentType,
	TextInputStyle,
	Collection,
	ChatInputCommandInteraction,
	StringSelectMenuInteraction,
	ModalSubmitInteraction,
	CacheType,
	TextInputComponent,
	ApplicationCommandType,
	Message,
	GuildMember,
	User,
	Guild
} from 'discord.js';

import { format } from '../../../core/functions/date_and_time.js';

import { Command } from '../../../../types/command.js';
import { generatePassword } from '../../../core/functions/random.js';
import { LanguageData } from '../../../../types/languageData.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';


export const command: Command = {
	name: "schedule",
	description: "Manager for schedule category!",
	description_localizations: {
		"fr": "Commande sous-groupé pour la catégorie de message pré-programmer"
	},
	category: 'schedule',
	thinking: false,
	permission: null,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message<true>, lang: LanguageData, options?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let table = client.db.table("SCHEDULE");

		let select = new StringSelectMenuBuilder()
			.setCustomId('starter')
			.setPlaceholder(lang.schedule_menu_placeholder)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_0)
					.setEmoji("📝")
					.setValue('0'),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_1)
					.setEmoji("🗑️")
					.setValue('1'),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_2)
					.setEmoji("⚠️")
					.setValue('2'),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_3)
					.setEmoji("📜")
					.setValue('3'),
			);

		let original_interaction = await client.func.method.interactionSend(interaction, {
			content: interaction.member.user.toString(),
			components: [
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
			],
		});

		let user = interaction.member.user as User;

		try {

			let collector = original_interaction.createMessageComponentCollector({
				filter: (member) => member.user.id === interaction.member?.user.id,
				componentType: ComponentType.StringSelect,
				time: 420_000
			});

			collector.on('collect', async i => {
				if (i.member?.user.id !== interaction.member?.user.id) {
					await i.reply({ content: lang.embed_interaction_not_for_you, ephemeral: true })
					return;
				}
				await chooseAction(i);
			});

			collector.on('end', () => {
				original_interaction.edit({
					content: null,
					embeds: [],
					files: [],
					components: [
						new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select.setDisabled(true)),
					]
				})
			});

		} catch (e) {
			return await client.func.method.interactionSend(interaction, { content: lang.embed_timeout_getbtn });
		};

		async function chooseAction(i: StringSelectMenuInteraction) {
			switch (i.values[0]) {
				case '0':
					let modal = await iHorizonModalResolve({
						customId: 'modal',
						title: lang.schedule_modal_title,
						deferUpdate: false,
						fields: [
							{
								customId: 'name',
								label: lang.schedule_modal_fields_1_label,
								style: TextInputStyle.Short,
								required: true,
								maxLength: 30,
								minLength: 5
							},
							{
								customId: 'desc',
								label: lang.schedule_modal_fields_2_label,
								style: TextInputStyle.Paragraph,
								required: true,
								maxLength: 400,
								minLength: 10
							},
						]
					}, i);

					if (!modal) return;
					executeAfterModal(modal);
					break;
				case '1':
					let u = await i.reply({ content: lang.schedule_delete_question, ephemeral: false });

					let deleteCollector = interaction.channel?.createMessageCollector({
						filter: (m) => m.author.id === interaction.member?.user.id,
						max: 1,
						time: 120_000
					});

					deleteCollector?.on('collect', async (message) => {
						await message.delete() && u.delete();
						deleteCollector?.stop();
						__1(message.content);
					});
					break;
				case '2':
					let u2 = await i.reply({ content: lang.schedule_deleteall_question, ephemeral: false });
					let deleteAllCollector = interaction.channel?.createMessageCollector({
						filter: (m) => m.author.id === interaction.member?.user.id,
						max: 1,
						time: 120_000
					});

					deleteAllCollector?.on('collect', async (message) => {
						await message.delete() && u2.delete();
						deleteAllCollector?.stop();
						if (message.content.toLowerCase() === 'y' || message.content.toLowerCase() === 'yes') {
							__2(true);
						} else {
							__2(false);
						};
					});
					break;
				case '3':
					await i.deferUpdate();
					__3();
					break;
				default:
					break;
			};

			async function __1(arg0: string) {
				let fetched = await table.get(`${interaction.member?.user.id}`);

				if (!fetched || !fetched[arg0]) {
					await original_interaction.edit({
						content: lang.schedule_delete_not_found
							.replace('${arg0}', arg0), embeds: [], files: []
					});
					return;
				} else {
					let embed = new EmbedBuilder()
						.setAuthor({
							name: user.globalName || user.username,
							iconURL: (interaction.member?.user as User).displayAvatarURL({ extension: 'png', size: 512 })
						})
						.setTitle(lang.schedule_delete_title_embed
							.replace('${arg0}', arg0)
						)
						.setThumbnail(interaction.guild?.iconURL() as string)
						.setColor('#ff0a0a')
						.setFooter(await client.func.displayBotName.footerBuilder(interaction))
						.setTimestamp();

					await table.delete(`${interaction.member?.user.id}.${arg0}`);
					await original_interaction.edit({
						content: lang.schedule_delete_confirm, embeds: [embed],
						files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
					});
					return;
				};
			};

			async function __2(arg0: boolean) {
				if (arg0) {
					await table.delete(`${interaction.member?.user.id}`);

					let embed = new EmbedBuilder()
						.setColor('#ff0a0a')
						.setAuthor({
							name: user.globalName || user.username,
							iconURL: user.displayAvatarURL({ extension: 'png', size: 512 })
						})
						.setFooter(await client.func.displayBotName.footerBuilder(interaction))
						.setTitle(lang.schedule_deleteall_title_embed)
						.setDescription(lang.schedule_deleteall_desc_embed)

					await original_interaction.edit({
						content: lang.schedule_deleteall_confirm,
						embeds: [embed],
						files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
					});
				} else {
					await original_interaction.edit({
						content: lang.schedule_deleteall_cancel,
						embeds: [],
						files: []
					});
					return;
				}
			};

			async function __3() {
				let fetched = await table.get(`${interaction.member?.user.id}`);

				if (!fetched) {
					await original_interaction.edit({ content: lang.schedule_list_not_schedule, embeds: [], files: [] });
					return;
				};

				let embed = new EmbedBuilder()
					.setFooter(await client.func.displayBotName.footerBuilder(interaction))
					.setTitle(lang.schedule_list_title_embed)
					.setColor('#60BEE0')
					.setAuthor({
						name: user.globalName || user.username,
						iconURL: user.displayAvatarURL({ extension: 'png', size: 512 })
					});

				for (let i in fetched) {
					embed.addFields({
						name: `#${i}`, value: lang.schedule_list_fields_embed
							.replace("${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}",
								format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')
							)
							.replace('${fetched[i]?.title}', fetched[i]?.title)
							.replace('${fetched[i]?.description}', fetched[i]?.description)
					});
				};

				await original_interaction.edit({
					content: lang.schedule_list_content_message,
					embeds: [embed],
					files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
				});
			};

			async function executeAfterModal(i: ModalSubmitInteraction<"cached">) {
				let collection = i.fields.fields;
				let nameValue = collection.get('name')?.value;
				let descValue = collection.get('desc')?.value;

				let embed = new EmbedBuilder()
					.setDescription(`\`\`\`${nameValue}\`\`\`\`\`\`${descValue}\`\`\``)
					.setAuthor({
						name: user.globalName || user.username,
						iconURL: user.displayAvatarURL({ extension: 'png', size: 512 })
					})
					.setTitle(lang.schedule_create_title_embed)
					.setThumbnail(interaction.guild?.iconURL() as string)
					.setColor('#00549f')
					.setFooter(await client.func.displayBotName.footerBuilder(interaction))
					.setTimestamp();

				await original_interaction.edit({ embeds: [embed], files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)] });
				let u = await i.reply({ content: lang.schedule_create_when_question });

				let dateCollector = interaction.channel?.createMessageCollector({
					filter: (m) => m.author.id === user.id,
					max: 1,
					time: 120_000
				});

				dateCollector?.on('collect', async (message) => {
					await message.delete() && u.delete();
					dateCollector?.stop();
					__0(client.timeCalculator.to_ms(message.content)!, collection);
				});


				async function __0(date0: number, collection: Collection<string, TextInputComponent>) {
					var scheduleCode = generatePassword({ length: 16 });

					if (Number.isNaN(date0)) {
						original_interaction.edit({
							embeds: [],
							content: lang.schedule_create_not_number_time
								.replace('${interaction.user}', user.toString()),
							files: []
						});
						return;
					};

					original_interaction.edit({
						embeds: [
							embed.addFields({
								name: lang.schedule_create_embed_fields_name_confirm,
								value: format(Date.now() + date0, 'YYYY/MM/DD HH:mm:ss'),
								inline: true
							}).setTitle(lang.schedule_create_embed_title_confirm.replace('${scheduleCode}', scheduleCode))
						],
						content: lang.schedule_create_confirm_msg
							.replace('${interaction.user}', user.toString())
							.replace('${scheduleCode}', scheduleCode)
					});

					await table.set(`${user.id}.${scheduleCode}`,
						{
							title: collection.get('name')?.value,
							description: collection.get('desc')?.value,
							expired: Date.now() + date0
						}
					);
				};
			};
		};
	},
};
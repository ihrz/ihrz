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
	ChatInputCommandInteraction,
	ApplicationCommandType,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType,
	MessageFlags,
	ActionRowBuilder,
	StringSelectMenuInteraction,
	CacheType,
	TextInputStyle,
	ButtonBuilder,
	ButtonStyle,
	UserSelectMenuBuilder,
	User,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { isNumber } from '../../../core/functions/method.js';
import { utcTimezones } from '../../../files/locales.js';

export const command: Command = {
	name: 'nightmode',

	description: '⭐️ (VERY UHQ) NightMode',
	description_localizations: {
		"fr": "⭐️ (VRAIMENT UHQ) Mode Nuit"
	},

	thinking: false,
	category: 'newfeatures',
	permission: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

		// if (interaction.guild.ownerId !== interaction.member.user.id) {
		// 	return await client.func.method.interactionSend(interaction, {
		// 		content: "Vous n'êtes pas le propriétaire du serveur, vous ne pouvez pas toucher à cette fonctionalité critique."
		// 	})
		// }

		let baseData: DatabaseStructure.NightMode = await client.db.get(`${interaction.guildId}.UTILS.NIGHT_MODE`) || {
			enabled: true,
			notify: true,
			time: [21, 9],
			wlBots: [],
			derankBot: true,
			utc: 1
		};

		let time = client.timeCalculator.to_ms("30m");

		const embed = new EmbedBuilder()
			.setColor("#000000")
			.setDescription(
				`# ⭐️ Mode Nuit
> *Qu'est-ce que le mode nuit?* Le mode nuit est une sécurité **[made by iHorizon](https://www.ihorizon.org)** qui permet de désactiver toute permissions administrateur sur un serveur discord pendant une période donnée.
> *Exemple, vous êtes sur un serveur Discord avec beaucoup de staffs dessus, vous voulez enlever toute les PA la nuit pour éviter un raid, un snipe de vanity discord, etc*
> *Vous êtes au bon endroit mon chère. **iHorizon seras toujours la solution.***

---
				`
			)
			.setFields(
				{
					name: "Module Activer",
					value: baseData.enabled ? "🟢" : "🔴"
				},
				{
					name: "Notifier l'owner du serveur",
					value: baseData.notify ? "🟢" : "🔴"
				},
				{
					name: "Derank les bots?",
					value: baseData.derankBot ? "🟢" : "🔴"
				},
				{
					name: "Bot sous liste blanche",
					value: baseData.wlBots?.map(x => `<@${x}>`).join('') || "aucun"
				},
				{
					name: "Plage Horaire",
					value: `${baseData.time![0]} - ${baseData.time![1]} (fuseau UTC sur ${utcTimezones[baseData.utc!]})`
				},
			)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId));

		const string_select = new StringSelectMenuBuilder()
			.setCustomId("nightmode_main_panel")
			.setPlaceholder("Paramétrer le mode nuit sur le serveur.")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Activer le mode nuit')
					.setDescription("Activer/Désactiver le mode nuit.")
					.setValue("enable_mode"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Avertir le propriétaire du serveur")
					.setDescription("Prévenir l'owner du serveur lors de l'activation/désactivation")
					.setValue("owner_notify"),
				new StringSelectMenuOptionBuilder()
					.setLabel('Configurer la plage horaire du mode nuit')
					.setDescription("Plage horaire où les PA sont retiré automatiquement.")
					.setValue("hours_window"),
				new StringSelectMenuOptionBuilder()
					.setLabel('Derank les bots')
					.setDescription("Faut-t'il derank les bots pendant la nuit?")
					.setValue("derank_bot"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Changer le fuseau horaire (UTC)")
					.setDescription("Si vous avez une heure spécifique vous devez le mettre (format nombre UTC)")
					.setValue("change_timezone")
			)

		const save_button = new ButtonBuilder()
			.setStyle(ButtonStyle.Success)
			.setCustomId("nightmode_save_config")
			.setEmoji(client.iHorizon_Emojis.Yes);

		const wl_bot_select_menu = new UserSelectMenuBuilder()
			.setCustomId("nightmode-wl-bots-wl")
			.setMaxValues(20)
			.setPlaceholder("Bot authorisé as être admin pendant la nuit")
			.setMinValues(0);

		function getComponent(disabled: boolean = false) {
			return [
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(string_select.setDisabled(disabled)),
				new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(wl_bot_select_menu.setDisabled(disabled)),
				new ActionRowBuilder<ButtonBuilder>().addComponents(save_button.setDisabled(disabled)),
			]
		}

		const ogResponse = await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			components: getComponent(false),
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});

		const collector2wish = ogResponse.createMessageComponentCollector({
			time,
			componentType: ComponentType.StringSelect
		});

		const collector2merde = ogResponse.createMessageComponentCollector({
			time,
			componentType: ComponentType.UserSelect
		})

		const collector2fdp = ogResponse.createMessageComponentCollector({
			time,
			componentType: ComponentType.Button
		});

		collector2wish.on('collect', async (i) => {
			if (i.user.id !== interaction.member.user.id) {
				return await i.reply({
					content: lang.help_not_for_you,
					flags: MessageFlags.Ephemeral
				})
			}

			if (i.values[0] === "hours_window") {
				await editHoursWindow(i, 2);
			} else if (i.values[0] === "owner_notify") {
				i.deferUpdate();
				await editOwnerNotify(1);
			} else if (i.values[0] === "enable_mode") {
				i.deferUpdate();
				await editEnableMode(0);
			} else if (i.values[0] === "derank_bot") {
				i.deferUpdate();
				await derank_bot(3)
			} else if (i.values[0] === "change_timezone") {
				await change_timezone(i, 4);
			}
		});

		async function editOwnerNotify(fieldsNumber: number) {
			baseData.notify = !baseData.notify;

			embed.data.fields![fieldsNumber].value = baseData.notify ? "🟢" : "🔴";

			await ogResponse.edit({
				embeds: [embed],
				components: getComponent(),
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
		}
		async function derank_bot(fieldsNumber: number) {
			baseData.notify = !baseData.notify;

			embed.data.fields![fieldsNumber].value = baseData.notify ? "🟢" : "🔴";

			await ogResponse.edit({
				embeds: [embed],
				components: getComponent(),
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
		}

		async function editEnableMode(fieldsNumber: number) {
			baseData.enabled = !baseData.enabled;

			embed.data.fields![fieldsNumber].value = baseData.enabled ? "🟢" : "🔴";

			await ogResponse.edit({
				embeds: [embed],
				components: getComponent(),
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
		}
		async function change_timezone(i: StringSelectMenuInteraction<CacheType>, fieldsNumber: number) {
			const options = Object.entries(utcTimezones).map(([offset, name]) => {
				const offsetNum = Number(offset);
				const displayOffset = offsetNum >= 0 ? `UTC+${offsetNum}` : `UTC${offsetNum}`;

				return new StringSelectMenuOptionBuilder()
					.setLabel(name)
					.setValue(offset)
					.setDescription(displayOffset);
			});

			let wait = await i.reply({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>()
						.addComponents(
							new StringSelectMenuBuilder()
								.setCustomId("utc_choice")
								.setPlaceholder("Choissiez le UTC pour votre serveur discord")
								.addOptions(options)
						)
				],
				flags: MessageFlags.Ephemeral
			});

			let collector2con = interaction.channel!.createMessageComponentCollector({
				time: 60_000,
				componentType: ComponentType.StringSelect
			});

			collector2con.on('collect', async (i) => {
				let utc = i.values?.[0];
				if (utc) {
					baseData.utc = Number(utc);
					embed.data.fields![fieldsNumber]!.value = `${baseData.time![0]} - ${baseData.time![1]} (fuseau UTC sur ${utcTimezones[baseData.utc!]})`
					await ogResponse.edit({
						embeds: [embed],
						components: getComponent(),
						files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
					});
					collector2con.stop();
				}
			})

			collector2con.on('end', async () => {
				wait.delete();

			})
		}

		async function editHoursWindow(i: StringSelectMenuInteraction<CacheType>, fieldsNumber: number) {
			const modal = await iHorizonModalResolve({
				customId: "night-mode",
				deferUpdate: false,
				fields: [
					{
						customId: "start",
						label: "Heure du Début (format 24 heure)",
						required: true,
						style: TextInputStyle.Short,
						maxLength: 4,
						minLength: 1,
					},
					{
						customId: "end",
						label: "Heure de Fin (format 24 heure)",
						required: true,
						style: TextInputStyle.Short,
						maxLength: 4,
						minLength: 1,
					}
				],
				title: "NightMode - Plage Horaire"
			}, i);

			let start_value = modal?.fields.getTextInputValue("start");
			let end_value = modal?.fields.getTextInputValue("end");

			if (!isNumber(start_value!) || !isNumber(end_value!)) {
				return await modal?.reply({
					content: lang.temporary_voice_limit_button_not_integer
						.replace("${interaction.client.iHorizon_Emojis.No}", interaction.client.iHorizon_Emojis.No),
					flags: MessageFlags.Ephemeral
				})
			}

			i.deferUpdate();

			let start_value_integerified = parseInt(start_value!);
			let end_value_integerified = parseInt(end_value!);

			if (start_value_integerified > 24 || start_value_integerified < 0) {
				return await modal?.reply({
					content: "L'heure est pas valide frérot",
					flags: MessageFlags.Ephemeral
				});
			} else if (end_value_integerified > 24 || end_value_integerified < 0) {
				return await modal?.reply({
					content: "L'heure est pas valide frérot",
					flags: MessageFlags.Ephemeral
				});
			}

			baseData.time = [start_value_integerified, end_value_integerified];
			embed.data.fields![fieldsNumber].value = `${baseData.time![0]} - ${baseData.time![1]}`;
			ogResponse.edit({
				embeds: [embed],
				components: getComponent(),
			})
		}

		collector2fdp.on("collect", async (i) => {
			if (i.user.id !== interaction.member.user.id) {
				return await i.reply({
					content: lang.help_not_for_you,
					flags: MessageFlags.Ephemeral
				})
			}

			if (i.customId === "nightmode_save_config") {
				await i.deferUpdate();
				collector2wish.stop();
				collector2merde.stop();
				await ogResponse.edit({
					components: getComponent(true)
				});
				await client.db.set(`${interaction.guildId}.UTILS.NIGHT_MODE`, baseData);
			}
		})

		collector2merde.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: MessageFlags.Ephemeral
				})
			}

			i.deferUpdate();

			if (i.values) {
				const users = await Promise.all(
					i.values.map(id => client.users.fetch(id).catch(() => null))
				);

				const bots = users.filter((u): u is User => u !== null && u.bot);

				baseData.wlBots = bots.map(u => u.id);
				embed.data.fields![3]!.value = baseData.wlBots.map(x => "<@" + x + ">").join(",")
				await ogResponse.edit({
					embeds: [embed],
					components: getComponent(),
					files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
				});
			}
		})
	},
};
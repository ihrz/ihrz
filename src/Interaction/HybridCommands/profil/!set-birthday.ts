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
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ColorResolvable,
	ComponentType,
	EmbedBuilder,
	Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';

import { SubCommand } from '../../../../types/command.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		let tableProfil = client.db.table('USER_PROFIL');
		let birthday = await tableProfil.get(`${interaction.member?.user.id}.birthday`) || {
			day: null,
			month: null,
			year: null
		};

		let buttons = [
			new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(lang.profil_birthday_month_button_label)
				.setEmoji("📅")
				.setCustomId("set_month"),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(lang.profil_birthday_day_button_label)
				.setEmoji("📅")
				.setCustomId("set_day"),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(lang.profil_birthday_year_button_label)
				.setEmoji("📅")
				.setCustomId("set_year"),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Success)
				.setLabel(lang.var_confirm)
				.setEmoji(client.iHorizon_Emojis.icon.Yes_Logo)
				.setCustomId("set_confirm"),
		];

		// function to generate random color in hex format
		function randomColor() {
			return '#' + Math.floor(Math.random() * 16777215).toString(16);
		};

		let introduction = lang.profil_birthday_embed_introduction
			.replaceAll("${client.iHorizon_Emojis.icon.Sparkles}", client.iHorizon_Emojis.icon.Sparkles)
			.replace("${client.iHorizon_Emojis.icon.Crown_Logo}", client.iHorizon_Emojis.icon.Crown_Logo)
			.replace("${interaction.member?.toString()}", interaction.member?.toString()!);

		// function to get the current birthday
		function getBirthdayString(): string {
			return lang.profil_birthday_embed_current_birthday
				.replace("${client.iHorizon_Emojis.icon.Pin}", client.iHorizon_Emojis.icon.Pin)
				.replace("${birthday.month}", birthday.month)
				.replace("${birthday.day}", birthday.day)
				.replace("${birthday.year}", birthday.year);
		};

		let embed = new EmbedBuilder()
			.setColor("#0092cc")
			.setTitle(lang.profil_birthday_embed_title)
			.setThumbnail((interaction.member?.displayAvatarURL() || interaction.member?.user.displayAvatarURL()) as string)
			.setDescription(introduction + getBirthdayString())
			.setFooter(await client.func.displayBotName.footerBuilder(interaction));

		const og_interaction = await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});

		// loop to change the color of the embed every 5 seconds
		let cool_loop = setInterval(() => {
			try {
				if (!og_interaction) return;

				embed.setColor(randomColor() as ColorResolvable)
				og_interaction.edit({ embeds: [embed] }).catch(() => false);
			} catch (error) { }
		}, 3500);

		const collector = og_interaction.createMessageComponentCollector({
			time: 1_800_000,
			componentType: ComponentType.Button
		});

		collector.on('collect', async (buttonInteraction) => {
			// check if the user is the same as the one who initiated the command
			if (buttonInteraction.user.id !== interaction.member?.user.id) {
				await buttonInteraction.reply({ content: lang.help_not_for_you, ephemeral: true });
				return;
			};

			// get the wanted value
			const value = buttonInteraction.customId.split("_")[1];

			switch (value) {
				case "month":
					set_month(buttonInteraction);
					break;
				case "day":
					set_day(buttonInteraction);
					break;
				case "year":
					set_year(buttonInteraction);
					break;
				case "confirm":
					// send a confirmation message
					await buttonInteraction.reply({ content: lang.ticket_panel_saved_conf, ephemeral: true });
					// stop the collector
					collector.stop();
					break;
			}
		});

		collector.on('end', async () => {
			// update the embed
			embed.setDescription(introduction + getBirthdayString())

			// disable the buttons
			buttons.forEach(button => button.setDisabled(true));

			// edit the message
			await og_interaction.edit({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)] });

			// clear the interval
			clearInterval(cool_loop);
		});

		async function set_year(buttonInteraction: ButtonInteraction) {
			// create a modal to get the year
			let modal = await iHorizonModalResolve({
				title: lang.profil_birthday_modal1_title,
				customId: "set_year",
				deferUpdate: false,
				fields: [
					{
						customId: "year",
						label: lang.profil_birthday_modal1_fields1_label,
						style: 1,
						required: true,
						maxLength: 4,
						minLength: 4
					}
				]
			}, buttonInteraction);

			if (!modal) return;

			// get the year
			let year = modal.fields.getTextInputValue("year");

			// check if the year is valid
			if (Number.isNaN(parseInt(year))
				|| parseInt(year) > new Date().getFullYear()
				|| parseInt(year) < 1900) {
				await modal.reply({ content: lang.profil_birthday_invalid_year, ephemeral: true });
				return;
			};

			// check if the year is already set
			if (birthday.year === year) {
				await modal.reply({ content: lang.profil_birthday_year_already_set, ephemeral: true });
				return;
			};

			// set the year
			await tableProfil.set(`${buttonInteraction.user.id}.birthday.year`, year);
			birthday.year = year;

			// send a confirmation message
			await modal.reply({ content: lang.profil_birthday_year_set, ephemeral: true });

			// update the embed
			embed.setDescription(introduction + getBirthdayString())

			await og_interaction.edit({ embeds: [embed] });

			return;
		}

		async function set_month(buttonInteraction: ButtonInteraction) {
			// create a modal to get the month
			let modal = await iHorizonModalResolve({
				title: lang.profil_birthday_modal2_title,
				customId: "set_month",
				deferUpdate: false,
				fields: [
					{
						customId: "month",
						label: lang.profil_birthday_modal2_fields1_label,
						style: 1,
						required: true,
						maxLength: 2,
						minLength: 2
					}
				]
			}, buttonInteraction);

			if (!modal) return;

			// get the month
			let month = modal.fields.getTextInputValue("month");

			// check if the month is valid
			if (Number.isNaN(parseInt(month))
				|| parseInt(month) > 12
				|| parseInt(month) < 1
			) {
				await modal.reply({ content: lang.profil_birthday_invalid_month, ephemeral: true });
				return;
			};

			// check if the month is already set
			if (birthday.month === month) {
				await modal.reply({ content: lang.profil_birthday_month_already_set, ephemeral: true });
				return;
			};

			// set the month
			await tableProfil.set(`${buttonInteraction.user.id}.birthday.month`, month);
			birthday.month = month;

			// send a confirmation message
			await modal.reply({ content: lang.profil_birthday_month_set, ephemeral: true });

			// update the embed
			embed.setDescription(introduction + getBirthdayString())

			await og_interaction.edit({ embeds: [embed] });

			return;
		}

		async function set_day(buttonInteraction: ButtonInteraction) {
			// create a modal to get the day
			let modal = await iHorizonModalResolve({
				title: lang.profil_birthday_modal3_title,
				customId: "set_day",
				deferUpdate: false,
				fields: [
					{
						customId: "day",
						label: lang.profil_birthday_modal3_fields1_label,
						style: 1,
						required: true,
						maxLength: 2,
						minLength: 2
					}
				]
			}, buttonInteraction);

			if (!modal) return;

			// get the day
			let day = modal.fields.getTextInputValue("day");

			// check if the day is valid
			if (Number.isNaN(parseInt(day))
				|| parseInt(day) > 31
				|| parseInt(day) < 1) {
				await modal.reply({ content: lang.profil_birthday_invalid_day, ephemeral: true });
				return;
			};

			// check if the day is already set
			if (birthday.day === day) {
				await modal.reply({ content: lang.profil_birthday_day_already_set, ephemeral: true });
				return;
			};

			// set the day
			await tableProfil.set(`${buttonInteraction.user.id}.birthday.day`, day);
			birthday.day = day;

			// send a confirmation message
			await modal.reply({ content: lang.profil_birthday_day_set, ephemeral: true });

			// update the embed
			embed.setDescription(introduction + getBirthdayString())

			await og_interaction.edit({ embeds: [embed] });

			return;
		};
	},
};
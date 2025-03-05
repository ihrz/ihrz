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
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { getGuildDataPerSecretCode, SavedMembersAuthRestore, securityCodeUpdate } from '../../../core/functions/authRestoreHelper.js';
import { discordLocales } from '../../../files/locales.js';
import { format } from '../../../core/functions/date_and_time.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const secretCode = interaction.options.getString("key")!;
		const table = client.db.table("AUTHRESTORE");
		const Data = getGuildDataPerSecretCode(await table.all(), secretCode);
		const AllUsersData = await (client.db.table("AUTHRESTORE")).get("saved_users") as SavedMembersAuthRestore;

		if (!Data) return client.func.method.interactionSend(interaction, {
			content: lang.rc_key_doesnt_exist
				.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
				.replace("${secretCode}", secretCode),
			ephemeral: true
		});

		await securityCodeUpdate({ guildId: Data.id, apiToken: client.config.api.apiToken, secretCode });

		const members = AllUsersData.filter(x => Data.data.members.includes(x.id)) || [];
		const itemsPerPage = 5;
		let currentCategory = 0;
		let currentPage = 0;

		let footer = await client.func.displayBotName.footerBuilder(interaction);

		const mainEmbed = new EmbedBuilder()
			.setColor(2829617)
			.setTitle(lang.rc_get_mainEmbed_title)
			.setFields(
				{ name: lang.rc_get_mainEmbed_field1_name, value: Data.id || "", inline: true },
				{ name: lang.rc_get_mainEmbed_field2_name, value: interaction.guild.roles.cache.get(Data.data.config.roleId)?.toString() || Data.data.config.roleId, inline: true },
				{ name: lang.rc_get_mainEmbed_field3_name, value: `${lang.rc_get_mainEmbed_field3_value}\n\n${format(new Date(Data.data.config.createDate || 0), "MM/DD/YYYY HH:mm")}`, inline: false },
				{ name: lang.rc_get_mainEmbed_field4_name, value: String(Data.data.config.securityCodeUsed || 0), inline: true },
				{ name: lang.rc_get_mainEmbed_field5_name, value: (await client.users.fetch(Data.data.config.author.id)).toString() || lang.rc_get_unkwnon_user.replace("${Data.data.config.author.id}", Data.data.config.author.id), inline: true }
			)
			.setFooter(footer);

		let htmlContent = client.htmlfiles['authRestoreGetPage'];

		const now = Date.now();

		const timeLabels = Array.from({ length: 30 }, (_, i) => {
			const date = new Date(now - ((29 - i) * 24 * 60 * 60 * 1000));
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		});

		const registrationData = timeLabels.map(dateLabel => {
			return members.filter(member => {
				if (!member.registerTimestamp) return false;

				const memberDate = new Date(member.registerTimestamp);
				const memberDateString = memberDate.toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric'
				});

				return memberDateString === dateLabel;
			}).length;
		});

		const localeData = Object.entries(members.reduce((acc: Record<string, number>, member) => {
			acc[member.locale] = (acc[member.locale] || 0) + 1;
			return acc;
		}, {}))
			.sort(([, a], [, b]) => b - a)
			.reduce((acc, [key, value]) => {
				acc[key] = value;
				return acc;
			}, {} as Record<string, number>);

		const recentVerifications = members
			.sort((a, b) => b.registerTimestamp - a.registerTimestamp)
			.slice(0, 10)
			.map(member => ({
				username: member.username,
				date: new Date(member.registerTimestamp).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			}));

		let given_role = interaction.guild.roles.cache.get(Data.data.config.roleId)?.name;

		htmlContent = htmlContent
			.replaceAll('{author_pfp}', interaction.member.user.displayAvatarURL({ size: 512 }))
			.replaceAll('{author_username}', interaction.member.user.globalName || interaction.member.user.displayName)
			.replaceAll('{guild_name}', interaction.guild.name)
			.replaceAll('{config_author}', Data.data.config.author.username)
			.replaceAll('{create_date}', new Date(Data.data.config.createDate).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			}))
			.replaceAll('{role_id}', given_role !== undefined ? "@" + given_role : Data.data.config.roleId)
			.replaceAll('{total_members}', String(members.length))
			.replaceAll('{total_verifications}', String(members.length))
			.replaceAll('{key_used_count}', String(Data.data.config.securityCodeUsed))
			.replaceAll('{registrationData}', JSON.stringify(registrationData))
			.replaceAll('{timeLabels}', JSON.stringify(timeLabels))
			.replaceAll('{localeData}', JSON.stringify(localeData))
			.replaceAll('{recentVerifications}', JSON.stringify(recentVerifications))
			.replaceAll('{created_by}', lang.rc_created_by)
			.replaceAll('{created_on}', lang.rc_created_on)
			.replaceAll('{total_members2}', lang.rc_total_membres)
			.replaceAll('{total_verification2}', lang.rc_total_verification)
			.replaceAll('{key_used_count2}', lang.rc_total_key_used_count)
			.replaceAll('{recent_locales_distribution}', lang.rc_recent_locales_distribution)
			.replaceAll('{recent_verifications}', lang.rc_recent_verifications)
			.replaceAll('{registration_over_time}', lang.rc_registration_over_time)
			.replaceAll('{role}', lang.var_roles);

		const image = await client.func.html2png(htmlContent, {
			elementSelector: '.container',
			omitBackground: true,
			selectElement: true,
		});

		const attachment = new AttachmentBuilder(image, { name: 'image.png' });

		const generateImageEmbed = (): EmbedBuilder => {
			const thirdCategoryEmbed = new EmbedBuilder()
				.setImage("attachment://image.png")
				.setColor(2829617)
				.setTimestamp()
				.setFooter(footer);

			return thirdCategoryEmbed;
		}


		const generateEmbed = (page: number): EmbedBuilder => {
			const embed = new EmbedBuilder()
				.setTitle(lang.rc_get_secondEmbed_title)
				.setDescription(lang.rc_get_secondEmbed_footer
					.replace("${from}", String(page + 1))
					.replace("${to}", String(Math.ceil(members.length / itemsPerPage)))
				)
				.setFooter(footer)
				.setTimestamp();

			const startIndex = page * itemsPerPage;
			const endIndex = Math.min(startIndex + itemsPerPage, members.length);
			embed.setDescription(members.slice(startIndex, endIndex).map((member, i) => {
				const localeEmoji = discordLocales[member.locale] || "🌐";
				return `${i + 1}) <@${member.id}>\n\`${lang.rc_get_locale}\`: ${localeEmoji} (**${member.locale}**)\n\`${lang.rc_get_username}\`: **${member.username}**`;
			}).join("\n"));

			return embed;
		};

		const getEmbedForCategory = () => {
			switch (currentCategory) {
				case 0: return mainEmbed;
				case 1: return generateEmbed(currentPage);
				case 2: return generateImageEmbed();
				default: return mainEmbed;
			}
		};

		const updateComponents = () => [
			new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setLabel("<<<")
						.setCustomId("pprevious")
						.setDisabled(currentCategory !== 1 || currentPage === 0),
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setEmoji(client.iHorizon_Emojis.icon.iHorizon_Pages)
						.setCustomId("pdeco")
						.setDisabled(true),
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setLabel(">>>")
						.setCustomId("pnext")
						.setDisabled(currentCategory !== 1 || currentPage >= Math.ceil(members.length / itemsPerPage) - 1)
				),
			new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setEmoji(client.iHorizon_Emojis.icon.iHorizon_Minus)
						.setCustomId("previous")
						.setDisabled(currentCategory === 0),
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setEmoji(client.iHorizon_Emojis.icon.iHorizon_Folder)
						.setCustomId("deco")
						.setDisabled(true),
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setEmoji(client.iHorizon_Emojis.icon.iHorizon_Plus)
						.setCustomId("next")
						.setDisabled(currentCategory >= 2)
				)
		];

		const message = await client.func.method.interactionSend(interaction, {
			embeds: [currentCategory === 0 ? mainEmbed : generateEmbed(currentPage)],
			components: updateComponents(),
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)],
			fetchReply: true
		});

		const collector = message.createMessageComponentCollector({ time: 60000 });

		collector.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) return;

			if (i.customId === "next") {
				currentCategory = Math.min(currentCategory + 1, 2);
				currentPage = 0;
			} else if (i.customId === "previous") {
				currentCategory = Math.max(currentCategory - 1, 0);
				currentPage = 0;
			} else if (i.customId === "pnext" && currentCategory === 1) {
				currentPage++;
			} else if (i.customId === "pprevious" && currentCategory === 1) {
				currentPage--;
			}

			let files = [];

			if (currentCategory === 2) files.push(attachment);

			await i.update({
				embeds: [getEmbedForCategory()],
				components: updateComponents(),
				files
			});
		});


		collector.on('end', async () => {
			await message.edit({ components: [] });
		});
	}
};
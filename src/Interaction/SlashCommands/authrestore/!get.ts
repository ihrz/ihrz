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
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import {
	getGuildDataPerSecretCode,
	SavedMembersAuthRestore,
	securityCodeUpdate
} from "../../../core/functions/authRestoreHelper.js";
import { discordLocales } from "../../../core/locales.js";
import { format } from "../../../core/functions/date_and_time.js";

import { SubCommand } from "../../../../types/command.js";
import { authRestoreTable } from "../../../Events/client/ready.js";
import {
	fetchAvatar,
	renderStatsPage
} from "../../../core/modules/statsPage.js";

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
		const AllUsersData = (await authRestoreTable.get(
			"saved_users"
		)) as SavedMembersAuthRestore;

		if (!Data || !Data.id || !Data.data.members)
			return client.func.method.interactionSend(interaction, {
				content: lang.rc_key_doesnt_exist
					.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					)
					.replace("${secretCode}", secretCode),
				flags: [1 << 6]
			});

		await securityCodeUpdate({
			guildId: Data.id,
			apiToken: client.config.api.apiToken,
			secretCode
		});

		const members =
			AllUsersData.filter((x) => Data.data.members.includes(x.id)) || [];
		const itemsPerPage = 5;
		let currentCategory = 0;
		let currentPage = 0;

		const footer = await client.func.displayBotName.footerBuilder(
			interaction.guildId!
		);

		const mainEmbed = new EmbedBuilder()
			.setColor(2829617)
			.setTitle(lang.rc_get_mainEmbed_title)
			.setFields(
				{
					name: lang.rc_get_mainEmbed_field1_name,
					value: Data.id || "",
					inline: true
				},
				{
					name: lang.rc_get_mainEmbed_field2_name,
					value:
						interaction.guild.roles.cache
							.get(Data.data.config.roleId)
							?.toString() || Data.data.config.roleId,
					inline: true
				},
				{
					name: lang.rc_get_mainEmbed_field3_name,
					value: `${lang.rc_get_mainEmbed_field3_value}\n\n${format(new Date(Data.data.config.createDate || 0), "MM/DD/YYYY HH:mm")}`,
					inline: false
				},
				{
					name: lang.rc_get_mainEmbed_field4_name,
					value: String(Data.data.config.securityCodeUsed || 0),
					inline: true
				},
				{
					name: lang.rc_get_mainEmbed_field5_name,
					value:
						(
							await client.users.fetch(Data.data.config.author.id)
						).toString() ||
						lang.rc_get_unkwnon_user.replace(
							"${Data.data.config.author.id}",
							Data.data.config.author.id
						),
					inline: true
				}
			)
			.setFooter(footer);

		const now = Date.now();

		const timeLabels = Array.from({ length: 30 }, (_, i) => {
			const date = new Date(now - (29 - i) * 24 * 60 * 60 * 1000);
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric"
			});
		});

		const registrationData = timeLabels.map((dateLabel) => {
			return members.filter((member) => {
				if (!member.registerTimestamp) return false;

				const memberDate = new Date(member.registerTimestamp);
				const memberDateString = memberDate.toLocaleDateString(
					"en-US",
					{
						month: "short",
						day: "numeric"
					}
				);

				return memberDateString === dateLabel;
			}).length;
		});

		const localeData = Object.entries(
			members.reduce((acc: Record<string, number>, member) => {
				acc[member.locale] = (acc[member.locale] || 0) + 1;
				return acc;
			}, {})
		)
			.sort(([, a], [, b]) => b - a)
			.reduce(
				(acc, [key, value]) => {
					acc[key] = value;
					return acc;
				},
				{} as Record<string, number>
			);

		const recentVerifications = members
			.sort((a, b) => b.registerTimestamp - a.registerTimestamp)
			.slice(0, 10)
			.map((member) => ({
				username: member.username,
				date: new Date(member.registerTimestamp).toLocaleDateString(
					"en-US",
					{
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit"
					}
				)
			}));

		const given_role = interaction.guild.roles.cache.get(
			Data.data.config.roleId
		)?.name;

		const roleLabel =
			given_role !== undefined
				? "@" + given_role
				: Data.data.config.roleId;

		const image = await renderStatsPage({
			title: "AuthRestore",
			meta: [
				interaction.guild.name,
				`${lang.rc_created_by} ${Data.data.config.author.username}`,
				`${lang.rc_created_on} ${new Date(
					Data.data.config.createDate
				).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric"
				})}`,
				`${lang.var_roles}: ${roleLabel}`
			],
			avatar: await fetchAvatar(
				interaction.member.user.displayAvatarURL({
					size: 256,
					extension: "png"
				})
			),
			footer: interaction.guild.name,
			blocks: [
				{
					type: "metrics",
					title: "AuthRestore",
					icon: "🔐",
					items: [
						{
							value: String(members.length),
							label: lang.rc_total_membres
						},
						{
							value: String(members.length),
							label: lang.rc_total_verification
						},
						{
							value: String(Data.data.config.securityCodeUsed),
							label: lang.rc_total_key_used_count
						}
					]
				},
				{
					type: "chart",
					title: lang.rc_registration_over_time,
					icon: "📈",
					labels: timeLabels,
					series: [
						{
							name: lang.rc_total_verification,
							color: "#5865F2",
							values: registrationData
						}
					]
				},
				{
					type: "columns",
					blocks: [
						{
							type: "list",
							title: lang.rc_recent_locales_distribution,
							icon: "🌐",
							empty: lang.var_none,
							rows: Object.entries(localeData)
								.slice(0, 10)
								.map(([locale, count]) => ({
									icon: discordLocales[locale] || "🌐",
									name: locale,
									value: String(count)
								}))
						},
						{
							type: "list",
							title: lang.rc_recent_verifications,
							icon: "✅",
							empty: lang.var_none,
							rows: recentVerifications.map((entry) => ({
								icon: "👤",
								name: entry.username,
								detail: entry.date,
								value: ""
							}))
						}
					]
				}
			]
		});

		const attachment = new AttachmentBuilder(image, { name: "image.png" });

		const generateImageEmbed = (): EmbedBuilder => {
			const thirdCategoryEmbed = new EmbedBuilder()
				.setImage("attachment://image.png")
				.setColor(2829617)
				.setTimestamp()
				.setFooter(footer);

			return thirdCategoryEmbed;
		};

		const generateEmbed = (page: number): EmbedBuilder => {
			const embed = new EmbedBuilder()
				.setTitle(lang.rc_get_secondEmbed_title)
				.setDescription(
					lang.rc_get_secondEmbed_footer
						.replace("${from}", String(page + 1))
						.replace(
							"${to}",
							String(Math.ceil(members.length / itemsPerPage))
						)
				)
				.setFooter(footer)
				.setTimestamp();

			const startIndex = page * itemsPerPage;
			const endIndex = Math.min(
				startIndex + itemsPerPage,
				members.length
			);
			embed.setDescription(
				members
					.slice(startIndex, endIndex)
					.map((member, i) => {
						const localeEmoji =
							discordLocales[member.locale] || "🌐";
						const globalIndex = startIndex + i + 1;
						return `${globalIndex}) <@${member.id}>\n\`${lang.rc_get_locale}\`: ${localeEmoji} (**${member.locale}**)\n\`${lang.rc_get_username}\`: **${member.username}**`;
					})
					.join("\n")
			);

			return embed;
		};

		const getEmbedForCategory = () => {
			switch (currentCategory) {
				case 0:
					return mainEmbed;
				case 1:
					return generateEmbed(currentPage);
				case 2:
					return generateImageEmbed();
				default:
					return mainEmbed;
			}
		};

		const updateComponents = () => [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel("<<<")
					.setCustomId("pprevious")
					.setDisabled(currentCategory !== 1 || currentPage === 0),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.iHorizon_Emojis.Pages)
					.setCustomId("pdeco")
					.setDisabled(true),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(">>>")
					.setCustomId("pnext")
					.setDisabled(
						currentCategory !== 1 ||
							currentPage >=
								Math.ceil(members.length / itemsPerPage) - 1
					)
			),
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.iHorizon_Emojis.Minus)
					.setCustomId("previous")
					.setDisabled(currentCategory === 0),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.iHorizon_Emojis.Folder)
					.setCustomId("deco")
					.setDisabled(true),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.iHorizon_Emojis.Plus)
					.setCustomId("next")
					.setDisabled(currentCategory >= 2)
			)
		];

		const message = await client.func.method.interactionSend(interaction, {
			embeds: [
				currentCategory === 0 ? mainEmbed : generateEmbed(currentPage)
			],
			components: updateComponents(),
			files: [
				await client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			],
			withResponse: true
		});

		const collector = message.createMessageComponentCollector({
			time: 60_000 * 15
		});

		collector.on("collect", async (i) => {
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

			const files = [];

			if (currentCategory === 2) files.push(attachment);

			await i.update({
				embeds: [getEmbedForCategory()],
				components: updateComponents(),
				files
			});
		});

		collector.on("end", async () => {
			await message.edit({ components: [] });
		});
	}
};

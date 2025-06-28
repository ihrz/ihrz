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
	ChatInputCommandInteraction,
	Message,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	time,
	ComponentType
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';
import { isValidDiscordInvite } from '../../../core/functions/method.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let invite: string;
		if (interaction instanceof ChatInputCommandInteraction) {
			invite = interaction.options.getString("discord_invite")!;
		} else {
			invite = client.func.method.string(args!, 0)!;
		}

		if (!isValidDiscordInvite(invite)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_inviteinfo_not_valid_invite
			});
			return;
		}

		const link_data = await client.fetchInvite(invite).catch(() => null);

		if (!link_data) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_inviteinfo_not_valid_invite
			});
			return;
		}

		const embed_1 = new EmbedBuilder()
			.setColor("Aqua")
			.setDescription(link_data.guild?.description || lang.profil_not_description_set)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
			.setTitle(link_data.guild?.name || lang.var_unknown_guild_name)
			.setFields(
				{
					name: lang.setlogschannel_var_channel,
					value: `${link_data.channel?.toString()} (ID: \`${link_data.channelId}\`)`
				},
				{
					name: lang.var_guild,
					value: `${link_data.guild?.name} (ID: \`${link_data.guild?.id}\`)`
				},
				{
					name: lang.userinfo_embed_fields_4_name,
					value: `${time(new Date(Number(link_data.guild?.createdTimestamp)), "R")}`
				}
			);

		// Second embed for additional info
		const embed_2 = new EmbedBuilder()
			.setColor("Aqua")
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
			.setTitle(link_data.guild?.name || lang.var_unknown_guild_name)
			.setFields(
				{
					name: lang.help_memberc_fields,
					value: `${link_data.memberCount || lang.var_unknown}`,
					inline: true
				},
				{
					name: lang.var_online_members,
					value: `${link_data.presenceCount || lang.var_unknown}`,
					inline: true
				},
				{
					name: lang.var_boost_level,
					value: `${link_data.guild?.premiumSubscriptionCount || 0}`,
					inline: true
				},
				{
					name: lang.var_features,
					value: link_data.guild?.features.length ? link_data.guild.features.join(', ') : lang.var_none
				}
			);

		const buttons_1: ButtonBuilder[] = [];

		if (link_data.guild?.icon) {
			buttons_1.push(new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel(lang.var_guild_icon)
				.setURL(link_data.guild?.iconURL({ size: 512, extension: "webp", forceStatic: false })!)
			);
		}

		if (link_data.guild?.banner) {
			buttons_1.push(new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel(lang.var_guild_banner)
				.setURL(link_data.guild?.bannerURL({ size: 512, extension: "webp", forceStatic: false })!)
			);
		}

		if (link_data.guild?.splash) {
			buttons_1.push(new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel(lang.var_guild_splash)
				.setURL(link_data.guild?.splashURL({ size: 512, extension: "webp", forceStatic: false })!)
			);
		}

		// Create components arrays properly
		const components: ActionRowBuilder<ButtonBuilder>[] = [];

		// Add link buttons if any exist
		if (buttons_1.length > 0) {
			components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons_1));
		}

		// Add navigation button
		components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(">>>")
				.setCustomId("inviteinfo-next-page")
		));

		let currentPage = 1;
		const totalPages = 2;

		const ogMessage = await client.func.method.interactionSend(interaction, {
			embeds: [embed_1],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)],
			components: components
		});

		const collector = ogMessage.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 120_000
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({ content: lang.help_not_for_you, ephemeral: true });
				return;
			}

			if (i.customId === "inviteinfo-next-page") {
				// Toggle between pages
				currentPage = currentPage === 1 ? 2 : 1;

				// Update button label
				const newComponents: ActionRowBuilder<ButtonBuilder>[] = [];

				if (buttons_1.length > 0) {
					newComponents.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons_1));
				}

				newComponents.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setLabel(currentPage === 1 ? ">>>" : "<<<")
						.setCustomId("inviteinfo-next-page")
				));

				await i.update({
					embeds: [currentPage === 1 ? embed_1 : embed_2],
					components: newComponents
				});
			}
		});

		collector.on("end", async () => {
			// Disable all buttons when collector ends
			const disabledComponents: ActionRowBuilder<ButtonBuilder>[] = [];

			if (buttons_1.length > 0) {
				const disabledLinkButtons = buttons_1.map(btn =>
					ButtonBuilder.from(btn).setDisabled(true)
				);
				disabledComponents.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...disabledLinkButtons));
			}

			disabledComponents.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(currentPage === 1 ? ">>>" : "<<<")
					.setCustomId("inviteinfo-next-page")
					.setDisabled(true)
			));

			try {
				await ogMessage.edit({ components: disabledComponents });
			} catch (error) {
				// Message might have been deleted
			}
		});
	},
};
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
	ChannelSelectMenuBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	ContainerBuilder,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { AntiSpam } from "../../../../types/antispam.js";
import { invalidateAntiSpamConfig } from "../../../core/modules/antiSpamEngine.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload
} from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const all_channels =
			(await client.db.get(
				`${interaction.guildId}.GUILD.ANTISPAM.BYPASS_CHANNELS`
			)) || ([] as AntiSpam.AntiSpamOptions["BYPASS_CHANNELS"]);

		const e = client.iHorizon_Emojis;
		const signature = await botSignature(client, interaction.guildId);
		const guildIcon = interaction.guild.iconURL({ size: 256 });

		// Channel ids shown on the card: the saved list, then the selection.
		let shown: string[] = Array.isArray(all_channels) ? all_channels : [];

		const select = new ChannelSelectMenuBuilder()
			.setCustomId("antispam-select-config")
			.setPlaceholder(lang.help_select_menu)
			.setChannelTypes([
				ChannelType.GuildForum,
				ChannelType.GuildMedia,
				ChannelType.GuildText,
				ChannelType.GuildCategory,
				ChannelType.GuildStageVoice,
				ChannelType.GuildVoice
			])
			.setMaxValues(25)
			.setMinValues(0);

		if (all_channels !== undefined && all_channels.length >= 1) {
			const channels: string[] = Array.isArray(all_channels)
				? all_channels
				: [all_channels];
			select.setDefaultChannels(channels);
		}

		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Success)
			.setCustomId("antispam-manage-save-button")
			.setLabel(lang.antispam_manage_button_label);

		const selectRow =
			new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
				select
			);
		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			button
		);
		// Once the time is up, the card stays without its menu and button.
		let closed = false;

		function render(): ContainerBuilder {
			const card = buildCard({
				accent: ACCENT.info,
				emoji: e.AutoMod_Spam,
				title: lang.antispam_manage_embed_title,
				description: lang.antispam_ignorechannels_embed_desc,
				thumbnail: guildIcon,
				fields: [
					{
						emoji: e.Ticket_Hash,
						label: lang.joinghostping_add_ok_embed_fields_name,
						value:
							shown.map((x) => `<#${x}>`).join(", ") ||
							lang.setjoinroles_var_none
					}
				],
				signature
			});
			if (!closed)
				card.addActionRowComponents(selectRow).addActionRowComponents(
					buttonRow
				);
			return card;
		}

		const originalResponse = await client.func.method.interactionSend(
			interaction,
			cardPayload(render()) as never
		);

		const collector = originalResponse.createMessageComponentCollector({
			componentType: ComponentType.ChannelSelect,
			time: 240_000
		});

		const buttonCollector =
			originalResponse.createMessageComponentCollector({
				time: 240_000,
				componentType: ComponentType.Button
			});

		let allchannel: string[] = Array.isArray(all_channels)
			? all_channels
			: [];

		buttonCollector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			await client.db.set(
				`${interaction.guildId}.GUILD.ANTISPAM.BYPASS_CHANNELS`,
				allchannel
			);
			invalidateAntiSpamConfig(interaction.guildId!);

			await i.deferUpdate();

			collector.stop();
			buttonCollector.stop();
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

			allchannel = i.values;
			shown = i.values;
			// The card is sent again with its menu: keep the new selection in it.
			select.setDefaultChannels(i.values);
			await originalResponse
				.edit(cardPayload(render()) as never)
				.catch(() => undefined);
		});

		collector.on("end", async () => {
			closed = true;
			await originalResponse
				.edit(cardPayload(render()) as never)
				.catch(() => undefined);
		});
	}
};

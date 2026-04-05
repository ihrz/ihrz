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
	BaseGuildTextChannel,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';

import { getStickyChannelConfig } from '../../../core/modules/stickyMessageManager.js';

function resolveStickyType(lang: LanguageData, config: DatabaseStructure.StickyChannelConfig): string {
	if (config.content && config.embedId) {
		return lang.sticky_var_text_embed;
	}

	if (config.embedId) {
		return lang.sticky_var_embed;
	}

	return lang.sticky_var_text;
}

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let channel: BaseGuildTextChannel | null = null;

		if (interaction instanceof ChatInputCommandInteraction) {
			channel = interaction.options.getChannel('channel') as BaseGuildTextChannel | null;
		} else {
			channel = await client.func.method.channel(interaction, args!, 0) as BaseGuildTextChannel | null;
		}

		if (!channel || channel.type !== ChannelType.GuildText) {
			await client.func.method.interactionSend(interaction, {
				content: lang.sticky_channel_command_error
					.replace('${interaction.user}', interaction.member.user.toString())
			});
			return;
		}

		const config = await getStickyChannelConfig(client, interaction.guildId!, channel.id);

		if (!config) {
			await client.func.method.interactionSend(interaction, {
				content: lang.sticky_show_command_not_found
					.replace('${interaction.user}', interaction.member.user.toString())
					.replace('${channel}', channel.toString())
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setColor('#11304c')
			.setTitle(lang.sticky_show_embed_title)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
			.addFields(
				{
					name: lang.sticky_show_embed_fields_channel,
					value: channel.toString(),
					inline: true
				},
				{
					name: lang.sticky_show_embed_fields_type,
					value: resolveStickyType(lang, config),
					inline: true
				},
				{
					name: lang.sticky_show_embed_fields_status,
					value: config.enabled ? lang.sticky_var_enabled : lang.sticky_var_disabled,
					inline: true
				},
				{
					name: lang.sticky_show_embed_fields_message,
					value: config.content || lang.sticky_var_none,
					inline: false
				},
				{
					name: lang.sticky_show_embed_fields_embed,
					value: config.embedId ? `\`${config.embedId}\`` : lang.sticky_var_none,
					inline: true
				},
				{
					name: lang.sticky_show_embed_fields_last_message,
					value: config.lastMessageId ? `\`${config.lastMessageId}\`` : lang.sticky_var_none,
					inline: true
				}
			);

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
	},
};

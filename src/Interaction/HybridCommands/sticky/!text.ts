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
	Message
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';

import {
	getStickyChannelConfig,
	getStickyChannelPath,
	queueStickyChannelRefresh
} from '../../../core/modules/stickyMessageManager.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let channel: BaseGuildTextChannel | null = null;
		let stickyMessage: string | null = null;

		if (interaction instanceof ChatInputCommandInteraction) {
			channel = interaction.options.getChannel('channel') as BaseGuildTextChannel | null;
			stickyMessage = interaction.options.getString('message', true);
		} else {
			channel = await client.func.method.channel(interaction, args!, 0) as BaseGuildTextChannel | null;
			stickyMessage = client.func.method.longString(args!, 1);
		}

		if (!channel || channel.type !== ChannelType.GuildText) {
			await client.func.method.interactionSend(interaction, {
				content: lang.sticky_channel_command_error
					.replace('${interaction.user}', interaction.member.user.toString())
			});
			return;
		}

		if (!stickyMessage?.trim()) {
			await client.func.method.interactionSend(interaction, {
				content: lang.sticky_text_command_missing_message
					.replace('${interaction.user}', interaction.member.user.toString())
			});
			return;
		}

		const previousConfig = await getStickyChannelConfig(client, interaction.guildId!, channel.id);

		const stickyData: DatabaseStructure.StickyChannelConfig = {
			channelId: channel.id,
			content: stickyMessage,
			embedId: null,
			lastMessageId: previousConfig?.lastMessageId || null,
			enabled: true
		};

		await client.db.set(getStickyChannelPath(interaction.guildId!, channel.id), stickyData);
		await queueStickyChannelRefresh(client, channel);

		await client.func.method.interactionSend(interaction, {
			content: lang.sticky_text_command_work
				.replace('${client.iHorizon_Emojis.Yes}', client.iHorizon_Emojis.Yes)
				.replace('${interaction.user}', interaction.member.user.toString())
				.replace('${channel}', channel.toString())
		});
	},
};

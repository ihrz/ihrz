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
	EmbedBuilder,
	InteractionEditReplyOptions,
	Message,
	MessageReplyOptions,
	PermissionsBitField,
	SnowflakeUtil,
	TextChannel
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var channel = interaction.options.getChannel("channel") as TextChannel;
			var buttonTitle = interaction.options.getString('button-title')?.substring(0, 32) || '+';
		} else {

			var channel = (await client.func.method.channel(interaction, args!, 0) || interaction.channel) as TextChannel;
			var buttonTitle = client.func.method.string(args!, 1)?.substring(0, 32) || '+';
		};

		await client.db.set(`${interaction.guildId}.CONFESSION.channel`, channel.id);

		await client.func.method.interactionSend(interaction, {
			content: lang.confession_channel_command_work
				.replace('${channel?.toString()}', channel.toString()!)
		});

		let embed = new EmbedBuilder()
			.setColor('#ff05aa')
			.setFooter(await client.func.displayBotName.footerBuilder(interaction))
			.setTimestamp()
			.setDescription(lang.confession_channel_panel_embed_desc)
			;

		let actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(buttonTitle)
				.setCustomId('new-confession-button')
		)

		const nonce = SnowflakeUtil.generate().toString();

		let message = await (channel as BaseGuildTextChannel).send({
			embeds: [embed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)],
			components: [actionRow],
			enforceNonce: true,
			nonce: nonce
		});

		await client.db.set(`${interaction.guildId}.GUILD.CONFESSION.panel`, {
			channelId: message.channelId,
			messageId: message.id
		});

		await client.func.ihorizon_logs(interaction, {
			title: lang.confession_channel_log_embed_title,
			description: lang.confession_channel_log_embed_desc
				.replace('${interaction.user}', interaction.member.user.toString())
				.replace('${channel}', channel.toString())
		});

		return;
	},
};
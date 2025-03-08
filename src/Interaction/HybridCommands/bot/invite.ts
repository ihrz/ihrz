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
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message,
	CommandInteractionOptionResolver,
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: 'invite',

	description: 'Get the bot invite link!',
	description_localizations: {
		"fr": "Obtenir le lien d'invitations du bot iHorizon"
	},

	aliases: ["inviteme", "oauth"],

	integration_types: [0, 1],
	contexts: [0, 1, 2],

	category: 'bot',
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		let button_add_me = new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setLabel(lang.invite_embed_title)
			.setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot`);

		let invites = new EmbedBuilder()
			.setColor("#416fec")
			.setTitle(lang.invite_embed_title)
			.setDescription(lang.invite_embed_description)
			.setURL('https://discord.com/api/oauth2/authorize?client_id=' + client.user?.id + '&permissions=8&scope=bot')
			.setFooter(await client.func.displayBotName.footerBuilder(interaction))
			.setThumbnail("attachment://footer_icon.png");

		let components = new ActionRowBuilder<ButtonBuilder>().addComponents(button_add_me);

		await client.func.method.interactionSend(interaction, {
			embeds: [invites],
			components: [components],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
		return;
	},
	permission: null
};
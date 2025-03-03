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
	ApplicationCommandOptionType,
	ApplicationCommandType,
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	GuildVoiceChannelResolvable,
	Message,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
export const command: Command = {

	name: 'remove-react',
	aliases: ['react-remove', 'removereact', 'reactremove'],

	description: 'Remove reaction by iHorizon when user send message',
	description_localizations: {
		"fr": "Supprimer une réaction d'iHorizon lorsque l'utilisateur envoie un message spécifiqe"
	},

	thinking: false,
	category: 'guildconfig',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: PermissionsBitField.Flags.ManageGuildExpressions,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message<true>, lang: LanguageData, options?: string[]) => {

		let message = options![0];

		await interaction.reply({
			content: lang.remove_react_command_work
				.replace("${interaction.member?.id}", interaction.member?.id!)
				.replace("${message.toLowerCase()}", message.toLowerCase())
			, allowedMentions: { repliedUser: false }
		});

		await client.db.delete(`${interaction.guildId}.GUILD.REACT_MSG.${message.toLowerCase()}`);
		return;
	},
};
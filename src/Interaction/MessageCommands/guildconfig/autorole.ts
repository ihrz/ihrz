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
	PermissionFlagsBits,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { subCommand } from "../../SlashCommands/guildconfig/!join-role.js"

export const command: Command = {

	name: 'autorole',
	aliases: ['join-role'],

	description: 'Set the autorole',
	description_localizations: {
		"fr": "Modifier l'autorole"
	},

	thinking: false,
	category: 'guildconfig',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: PermissionFlagsBits.Administrator,
	run: async (client: Client, interaction: Message<true>, lang: LanguageData, options?: string[]) => {
		subCommand.run(client, interaction, lang)
	},
};
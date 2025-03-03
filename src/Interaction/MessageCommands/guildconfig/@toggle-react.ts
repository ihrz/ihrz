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

	name: 'toggle-react',
	aliases: ['react-toggle', 'togglereact', 'reacttoggle'],

	description: 'Enable / Disable the reaction when user greets someone',
	description_localizations: {
		"fr": "Activer/Désactiver la réaction lorsque l'utilisateur salue quelqu'un"
	},

	thinking: false,
	category: 'guildconfig',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: PermissionsBitField.Flags.ManageGuildExpressions,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message<true>, lang: LanguageData, options?: string[]) => {

		let active: boolean;

		if (await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.hey_reaction`) === true) {

			active = false;
			await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.hey_reaction`, active)
		} else {

			active = true;
			await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.hey_reaction`, active)
		};
		let activeMsg = active ? lang.toggle_react_react : lang.toggle_react_doesnt_react;

		await interaction.reply({
			content: lang.toggle_react_command_work
				.replace("{activeMsg}", activeMsg)
				.replace("${interaction.member?.id}", interaction.member?.id!)
			, allowedMentions: { repliedUser: false }
		});
		return;
	},
};
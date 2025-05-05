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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';

import backup from "discord-rebackup";
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;


		if (interaction instanceof ChatInputCommandInteraction) {
			var only_guild_owner = interaction.options.getString("only_guild_owner", true);
		} else {
			var only_guild_owner = client.func.method.string(args!, 1)!;
		};

		if (interaction.member.user.id !== interaction.guild.ownerId) {
			client.func.method.interactionSend(interaction, {
				content: lang.backup_manage_nique_tes_mort
			})
			return;
		}

		let state = true;
		if (only_guild_owner == 'yes') {
			state = true
		} else {
			state = false;
		}

		await client.db.set(`${interaction.guildId}.GUILD.BACKUP.onlyOwner`, state);

		let allowed_user_string = state ? lang.backup_manage_owner : lang.backup_manage_admin;

		await client.func.method.interactionSend(interaction, {
			content: lang.backup_manage_command_ok
				.replace("${allowed_user_string}", allowed_user_string)
		})
	},
};
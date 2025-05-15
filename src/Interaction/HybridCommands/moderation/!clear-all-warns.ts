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
	EmbedBuilder,
	PermissionsBitField,
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	GuildMember,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';
import promptYesOrNo from '../../../core/functions/awaitingResponse.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;;

		let DbData = await client.db.get(`${interaction.guild?.id}.USER`) as DatabaseStructure.DbGuildUserObject[];

		let response = await promptYesOrNo(interaction, {
			content: "**Are you really sure you want to delete all warns data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
			noButton: lang.resetallinvites_no_button,
			yesButton: lang.resetallinvites_yes_button,
			dangerAction: true
		})

		if (response) {
			for (let entries in DbData) {
				await client.db.delete(`${interaction.guild?.id}.USER.${entries}.WARNS`)
			}

			await client.func.method.interactionSend(interaction, {
				content: "fdp ok"
			});
		} else {
			await client.func.method.interactionSend(interaction, {
				content: "on as anuler la commande batar",
				components: []
			});
		}
		return;
	},
};
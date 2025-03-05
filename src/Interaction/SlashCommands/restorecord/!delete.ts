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
	ButtonBuilder,
	ButtonStyle,
	Channel,
	ChatInputCommandInteraction,
	Client,
	GuildTextBasedChannel,
	PermissionsBitField
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		let result: DatabaseStructure.AuthRestoreSchema | null = await client.db.get(`${interaction.guildId}.GUILD.RESTORECORD`);

		if (!result) return client.func.method.interactionSend(interaction, { content: lang.rc_delete_config_not_found });

		(interaction.guild.channels.cache.get(result?.channelId!) as GuildTextBasedChannel | undefined)?.messages.fetch(result?.messageId)
			.then(async msg => {
				if (msg?.author.id !== client.user?.id) {
					return await client.func.method.interactionSend(interaction, { content: lang.buttonreaction_message_other_user_error });
				};

				msg.edit({
					components: []
				});

				await client.db.delete(`${interaction.guildId}.GUILD.RESTORECORD`);

				await client.func.method.interactionSend(interaction, {
					content: lang.rc_delete_command_ok
						.replace("${interaction.user.toString()}", interaction.user.toString()),
					ephemeral: true
				});
			})
			.catch(async (err) => {
				console.error(err)
				await client.func.method.interactionSend(interaction, { content: lang.reactionroles_cant_fetched_reaction_remove })
				return;
			});
		return;

	},
};
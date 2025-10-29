/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

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
	ChatInputCommandInteraction,
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../../types/database_structure.js';
import { SubCommand } from '../../../../../types/command.js';
import { permissionLevel } from './perm.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		if (interaction.member.id !== interaction.guild.ownerId) {
			await client.func.method.interactionSend(interaction, {
				content: lang.perm_roles_not_owner
			});
			return;
		}

		const perm_level = parseInt(interaction.options.getString("perm_level", true));
		const perm_role = interaction.options.getRole("perm_role", true);

		try {
			const updatedRoles: DatabaseStructure.UtilsRoleData = await client.db.get(`${interaction.guildId}.UTILS.roles`) || {};

			updatedRoles[perm_level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] = perm_role.id;

			await client.db.set(`${interaction.guildId}.UTILS.roles`, updatedRoles);

			let permName = permissionLevel.find(x => x.value === String(perm_level))?.name;
			let strRole = perm_role.toString();

			client.func.method.interactionSend(interaction, {
				content: lang.perm_edit_roles_command_ok.replace("${permName}", String(permName)).replace("${strRole}", strRole)
			})
		} catch (error) {
			await client.func.method.interactionSend(interaction, {
				content: lang.perm_roles_error
			});
		}
	},
};
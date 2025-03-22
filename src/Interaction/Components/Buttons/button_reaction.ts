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

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { ButtonInteraction } from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';

export default async function (interaction: ButtonInteraction<"cached">, lang: LanguageData) {

	let res = await interaction.client.db.get(
		`${interaction.guildId}.GUILD.REACTION_ROLES.${interaction.message.id}`
	) as DatabaseStructure.ReactionRolesData[""]
	if (!res) return;

	let filtered_res = res[interaction.customId];

	let fetched_role = interaction.guild.roles.cache.get(filtered_res.rolesID) || await interaction.guild.roles.fetch(filtered_res.rolesID).catch(() => null);

	if (!fetched_role) {
		await interaction.reply({
			content: lang.buttonreaction_role_doesnt_exit,
			flags: [1 << 6]
		})
	} else if (fetched_role.rawPosition >= Number(interaction.guild.members.me?.roles.highest.rawPosition)) {
		await interaction.reply({
			content: lang.buttonreaction_role_too_high,
			flags: [1 << 6]
		})
	} else {
		if (interaction.member.roles.cache.has(fetched_role.id)) {
			await interaction.member.roles.remove(fetched_role.id, "[ButtonReaction] Module");
			await interaction.reply({
				content: lang.buttonreaction_role_add
					.replace("${fetched_role.toString()}", fetched_role.toString()),
				flags: [1 << 6]
			});
		} else {
			await interaction.member.roles.add(fetched_role.id, "[ButtonReaction] Module");
			await interaction.reply({
				content: lang.buttonreaction_role_remove
					.replace("${fetched_role.toString()}", fetched_role.toString()),
				flags: [1 << 6]
			});
		}
	}
};
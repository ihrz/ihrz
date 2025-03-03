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

import { Client, ApplicationCommandType, UserContextMenuCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { AnotherCommand } from '../../../types/anotherCommand.js';

import { subCommand } from '../HybridCommands/utils/!userinfo.js';
import getLanguageData from '../../core/functions/getLanguageData.js';

export const command: AnotherCommand = {
	name: 'User Lookup',
	type: ApplicationCommandType.User,
	thinking: false,
	permission: PermissionFlagsBits.Administrator,
	run: async (client: Client, interaction: UserContextMenuCommandInteraction) => {
		// @ts-ignore
		subCommand.run(client, interaction, await getLanguageData(interaction.guildId!));
	},
};
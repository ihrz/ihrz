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
    PermissionsBitField,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../../types/database_structure.js';
import { SubCommand } from '../../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        var roles = ["Perm 1", "Perm 2", "Perm 3", "Perm 4", "Perm 5", "Perm 6", "Perm 7", "Perm 8"];
        let existingRoles = await client.db.get(`${interaction.guildId}.UTILS.roles`) || {} as DatabaseStructure.UtilsRoleData;

        try {
            let updatedRoles: DatabaseStructure.UtilsRoleData = {};
            let createdRoles: string[] = [];

            for (let i = 0; i < roles.length; i++) {
                const permLevel = i + 1;
                const existingRoleId = existingRoles[permLevel];

                if (existingRoleId) {
                    const roleExists = await interaction.guild!.roles.fetch(existingRoleId).catch(() => null);
                    if (roleExists) {
                        updatedRoles[permLevel as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] = existingRoleId;
                        continue;
                    }
                }

                const newRole = await interaction.guild!.roles.create({ name: roles[i] });
                updatedRoles[permLevel as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] = newRole.id;
                createdRoles.push(roles[i]);
            }

            await client.db.set(`${interaction.guildId}.UTILS.roles`, updatedRoles);


            if (createdRoles.length > 0) {
                await client.method.interactionSend(interaction, {
                    content: lang.perm_roles_created_role.replace("${createdRoles.join(', ')}", createdRoles.join(", "))
                });
            } else {
                await client.method.interactionSend(interaction, {
                    content: lang.perm_roles_already_upate
                });
            }
        } catch (error) {
            await client.method.interactionSend(interaction, {
                content: lang.perm_roles_error
            });
        }
    },
};
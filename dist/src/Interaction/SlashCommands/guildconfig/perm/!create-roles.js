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
import { PermissionsBitField, } from 'discord.js';
export default {
    run: async (client, interaction, lang, command, neededPerm) => {
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel)
            return;
        if ((!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) && neededPerm === 0)) {
            await client.method.interactionSend(interaction, { content: lang.setup_not_admin });
            return;
        }
        var roles = ["Perm 1", "Perm 2", "Perm 3", "Perm 4", "Perm 5", "Perm 6", "Perm 7", "Perm 8"];
        let existingRoles = await client.db.get(`${interaction.guildId}.UTILS.roles`) || {};
        try {
            let updatedRoles = {};
            let createdRoles = [];
            for (let i = 0; i < roles.length; i++) {
                const permLevel = i + 1;
                const existingRoleId = existingRoles[permLevel];
                if (existingRoleId) {
                    const roleExists = await interaction.guild.roles.fetch(existingRoleId).catch(() => null);
                    if (roleExists) {
                        updatedRoles[permLevel] = existingRoleId;
                        continue;
                    }
                }
                const newRole = await interaction.guild.roles.create({ name: roles[i] });
                updatedRoles[permLevel] = newRole.id;
                createdRoles.push(roles[i]);
            }
            await client.db.set(`${interaction.guildId}.UTILS.roles`, updatedRoles);
            if (createdRoles.length > 0) {
                await client.method.interactionSend(interaction, {
                    content: lang.perm_roles_created_role.replace("${createdRoles.join(', ')}", createdRoles.join(", "))
                });
            }
            else {
                await client.method.interactionSend(interaction, {
                    content: lang.perm_roles_already_upate
                });
            }
        }
        catch (error) {
            await client.method.interactionSend(interaction, {
                content: lang.perm_roles_error
            });
        }
    },
};

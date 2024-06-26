/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { PermissionsBitField, Client, GuildMember } from 'pwss';

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "guildMemberRemove",
    run: async (client: Client, member: GuildMember) => {

        if (await client.db.get(`${member.guild.id}.GUILD_CONFIG.rolesaver.enable`)) {
            await client.db.delete(`${member.guild.id}.ROLE_SAVER.${member.user.id}`);

            let admin = await client.db.get(`${member.guild.id}.GUILD_CONFIG.rolesaver.admin`);
            let rolesArray: string[] = [];

            member.roles.cache.each((role) => {
                if (role.id === member.guild.roles.everyone.id) {
                    return;
                }

                if (role.permissions.has(PermissionsBitField.Flags.Administrator) && admin === 'no') {
                    return;
                }

                rolesArray.push(role.id);
            });

            await client.db.set(`${member.guild.id}.ROLE_SAVER.${member.user.id}`, rolesArray);
            return;
        }
    },
};
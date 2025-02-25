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

import { Client, GuildMember, PermissionsBitField } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {
        try {
            if (!member.guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

            const roleid = await Promise.resolve(client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinroles`)) as DatabaseStructure.GuildConfigSchema['joinroles'];
            if (!roleid) return;

            await Promise.resolve().then(async () => {
                if (Array.isArray(roleid)) {
                    await member.roles.set(roleid).catch(() => null);
                } else {
                    const role = member.guild.roles.cache.get(roleid);
                    if (role) await member.roles.add(role).catch(() => null);
                }
            });
        } catch {}
    }
};

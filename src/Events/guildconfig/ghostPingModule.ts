/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { BaseGuildTextChannel, Client, GuildMember } from 'discord.js';
import { BotEvent } from '../../../types/event';
import { DatabaseStructure } from '../../core/database_structure';

const processedMembers = new Set<string>();

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {
        /**
         * Why doing this?
         * On iHorizon Production, we have some ~discord.js problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         * As always, fuck discord.js
         */
        if (processedMembers.has(member.id)) return;
        processedMembers.add(member.id);
        setTimeout(() => processedMembers.delete(member.id), 7000);

        let all_channels = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.GHOST_PING.channels`) as DatabaseStructure.GhostPingData['channels'];

        if (!all_channels) return;

        for (let i of all_channels) {
            const channel = member.guild.channels.cache.get(i);
            if (!channel) continue;

            const msg = await (channel as BaseGuildTextChannel).send({ content: member.user.toString() });

            try {
                await msg.delete().catch(() => { });
            } catch (e) {
                await msg.delete().catch(() => { });
            }
        };
    },
};
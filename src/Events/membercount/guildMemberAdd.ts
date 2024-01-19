/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { Client, GuildMember } from "discord.js";

export default async (client: Client, member: GuildMember) => {

    try {
        let botMembers = member.guild.members.cache.filter((member) => member.user.bot);
        let rolesCount = member.guild.roles.cache.size;

        let baseData = await client.db.get(`${member.guild.id}.GUILD.MCOUNT`);
        let bot = baseData?.bot;
        let member_2 = baseData?.member;
        let roles = baseData?.roles;

        if (bot) {
            let joinmsgreplace = bot.name
                .replace("{botcount}", botMembers.size);

            let Fetched = member.guild.channels.cache.get(bot.channel);
            Fetched?.edit({ name: joinmsgreplace });
            return;
        } else if (member_2) {
            let joinmsgreplace = member_2.name
                .replace("{membercount}", member.guild.memberCount);

            let Fetched = member.guild.channels.cache.get(member_2.channel);
            Fetched?.edit({ name: joinmsgreplace });
            return;
        } else if (roles) {
            let joinmsgreplace = roles.name
                .replace("{rolescount}", rolesCount);

            let Fetched = member.guild.channels.cache.get(roles.channel);
            Fetched?.edit({ name: joinmsgreplace });
            return;
        };
    } catch (e) { return };
};
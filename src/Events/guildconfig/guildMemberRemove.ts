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

import { Client, GuildMember, BaseGuildTextChannel } from 'discord.js';

export default async (client: Client, member: GuildMember) => {
    let data = await client.functions.getLanguageData(member.guild.id);

    try {
        let base = await client.db.get(`${member.guild.id}.USER.${member.user.id}.INVITES.BY`);
        let inviter = await client.users.fetch(base.inviter);

        let check = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES`);

        if (check) {
            await client.db.sub(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`, 1);
            await client.db.add(`${member.guild.id}.USER.${inviter.id}.INVITES.leaves`, 1);
        };

        var invitesAmount = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`);
        var lChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);

        if (!lChan || !client.channels.cache.get(lChan)) return;

        let joinMessage = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);

        if (!joinMessage) {
            let lChanManager = client.channels.cache.get(lChan);

            (lChanManager as BaseGuildTextChannel).send({
                content: data.event_goodbye_inviter
                    .replace("${member.id}", member.id)
                    .replace("${member.guild.name}", member.guild.name)
                    .replace("${inviter.tag}", inviter.username)
                    .replace("${fetched}", invitesAmount)
            });
            return;
        };

        var joinMessageFormated = joinMessage
            .replace("{user}", member.user.username)
            .replace("{guild}", member.guild.name)
            .replace("{membercount}", member.guild.memberCount)
            .replace("{inviter}", inviter.username)
            .replace("{invites}", invitesAmount);

        let lChanManager = client.channels.cache.get(lChan);

        (lChanManager as BaseGuildTextChannel).send({ content: joinMessageFormated }).catch(() => { });
    } catch (e) {
        let lChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);

        if (!lChan || !client.channels.cache.get(lChan)) return;
        let lChanManager = client.channels.cache.get(lChan);

        await (lChanManager as BaseGuildTextChannel).send({
            content: data.event_goodbye_default
                .replace("${member.id}", member.id)
                .replace("${member.guild.name}", member.guild.name)
        }).catch(() => { });
        return;
    };
};
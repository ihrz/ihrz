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

import { Client, GuildMember, BaseGuildTextChannel, SnowflakeUtil } from 'pwss';

import { BotEvent } from '../../../types/event';
import { DatabaseStructure } from '../../core/database_structure';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "guildMemberRemove",
    run: async (client: Client, member: GuildMember) => {
        /**
         * Why doing this?
         * On iHorizon Production, we have some ~problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         */
        const nonce = SnowflakeUtil.generate().toString();
        let data = await client.func.getLanguageData(member.guild.id) as LanguageData;

        try {
            let base = await client.db.get(`${member.guild.id}.USER.${member.user.id}.INVITES.BY`);
            let inviter = await client.users.fetch(base.inviter);

            let check = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES`) as DatabaseStructure.InvitesUserData

            if (check) {
                if (check?.invites! >= 1) {
                    await client.db.sub(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`, 1);
                }

                await client.db.add(`${member.guild.id}.USER.${inviter.id}.INVITES.leaves`, 1);
            };

            var invitesAmount = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`);
            var lChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);

            if (!lChan || !member.guild.channels.cache.get(lChan)) return;

            let joinMessage = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);

            if (!joinMessage) {
                let lChanManager = member.guild.channels.cache.get(lChan);

                (lChanManager as BaseGuildTextChannel).send({
                    content: data.event_goodbye_inviter
                        .replaceAll("{memberUsername}", member.user.username)
                        .replaceAll("{memberMention}", member.user.toString())
                        .replaceAll('{memberCount}', member.guild?.memberCount.toString()!)
                        .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                        .replaceAll('{guildName}', member.guild?.name!)
                        .replaceAll('{inviterUsername}', inviter.username)
                        .replaceAll('{inviterMention}', inviter.toString())
                        .replaceAll('{invitesCount}', invitesAmount)
                        .replaceAll("\\n", '\n'), enforceNonce: true, nonce: nonce
                });
                return;
            };

            var joinMessageFormated = joinMessage
                .replaceAll("{memberUsername}", member.user.username)
                .replaceAll("{memberMention}", member.user.toString())
                .replaceAll('{memberCount}', member.guild?.memberCount.toString()!)
                .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                .replaceAll('{guildName}', member.guild?.name!)
                .replaceAll('{inviterUsername}', inviter.username)
                .replaceAll('{inviterMention}', inviter.toString())
                .replaceAll('{invitesCount}', invitesAmount)
                .replaceAll("\\n", '\n');

            let lChanManager = member.guild.channels.cache.get(lChan) as BaseGuildTextChannel;

            lChanManager.send({ content: joinMessageFormated, enforceNonce: true, nonce: nonce }).catch(() => { });
            return;
        } catch (e) {
            let lChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);

            if (!lChan || !member.guild.channels.cache.get(lChan)) return;
            let lChanManager = member.guild.channels.cache.get(lChan);

            (lChanManager as BaseGuildTextChannel).send({
                content: data.event_goodbye_default
                    .replaceAll("{memberUsername}", member.user.username)
                    .replaceAll("{memberMention}", member.user.toString())
                    .replaceAll('{memberCount}', member.guild?.memberCount.toString()!)
                    .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                    .replaceAll('{guildName}', member.guild?.name!)
                    .replaceAll('{invitesCount}', invitesAmount)
                    .replaceAll("\\n", '\n'), enforceNonce: true, nonce: nonce
            }).catch(() => { });
            return;
        }
    },
};
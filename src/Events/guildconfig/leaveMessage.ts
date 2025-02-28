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

import { Client, GuildMember, BaseGuildTextChannel, SnowflakeUtil } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { LanguageData } from '../../../types/languageData.js';

export const event: BotEvent = {
    name: "guildMemberRemove",
    run: async (client: Client, member: GuildMember) => {
        const nonce = SnowflakeUtil.generate().toString();
        let data = await client.func.getLanguageData(member.guild.id);
        let guildLocal = await client.db.get(`${member.guild.id}.GUILD.LANG.lang`) || "en-US";

        try {
            let base = await client.db.get(`${member.guild.id}.USER.${member.user.id}.INVITES.BY`);
            let lChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);
            let leaveMessage = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);

            if (!lChan || !member.guild.channels.cache.get(lChan)) return;
            let lChanManager = member.guild.channels.cache.get(lChan) as BaseGuildTextChannel;

            if (base?.inviter) {
                const inviter = await client.users.fetch(base.inviter);
                const inviterStats = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES`) as DatabaseStructure.InvitesUserData;

                if (inviterStats) {
                    if (inviterStats?.invites && inviterStats.invites >= 1) {
                        await client.db.sub(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`, 1);
                    }
                    await client.db.add(`${member.guild.id}.USER.${inviter.id}.INVITES.leaves`, 1);
                }

                const invitesAmount = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`);

                const messageContent = client.method.generateCustomMessagePreview(
                    leaveMessage || data.event_goodbye_inviter,
                    {
                        user: member.user,
                        guild: member.guild,
                        guildLocal: guildLocal,
                        inviter: {
                            user: {
                                username: inviter.username,
                                mention: inviter.toString()
                            },
                            invitesAmount
                        }
                    }
                );

                await lChanManager.send({
                    content: messageContent,
                    enforceNonce: true,
                    nonce: nonce
                }).catch(() => false);
                return;
            } else {
                await lChanManager.send({
                    content: client.method.generateCustomMessagePreview(
                        leaveMessage ||
                        data.event_goodbye_default,
                        {
                            user: member.user,
                            guild: member.guild,
                            guildLocal: guildLocal,
                        }
                    ),
                    enforceNonce: true,
                    nonce: nonce
                }).catch(() => { });
            }
        } catch (e) {
            let lChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);
            if (!lChan || !member.guild.channels.cache.get(lChan)) return;

            let lChanManager = member.guild.channels.cache.get(lChan) as BaseGuildTextChannel;
            await lChanManager.send({
                content: client.method.generateCustomMessagePreview(
                    data.event_goodbye_default,
                    {
                        user: member.user,
                        guild: member.guild,
                        guildLocal: guildLocal,
                    }
                ),
                enforceNonce: true,
                nonce: nonce
            }).catch(() => { });
        }
    },
};
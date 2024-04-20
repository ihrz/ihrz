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

import { BaseGuildTextChannel, Client, GuildFeature, GuildMember, Invite, PermissionsBitField } from 'discord.js';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {

        let data = await client.functions.getLanguageData(member.guild.id);

        if (!member.guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;

        let oldInvites = client.invites.get(member.guild.id);
        let newInvites = await member.guild.invites.fetch();

        let invite = newInvites.find((i: Invite) => i.uses && i.uses > (oldInvites?.get(i.code) || 0));

        if (invite) {
            let inviter = await client.users.fetch(invite?.inviterId as string);
            client.invites.get(member.guild.id)?.set(invite?.code, invite?.uses);

            let check = await client.db.get(`${invite?.guild?.id}.USER.${inviter.id}.INVITES`);

            if (check) {

                await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.regular`, 1);
                await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.invites`, 1);

            } else {

                await client.db.set(`${invite?.guild?.id}.USER.${inviter.id}.INVITES`,
                    {
                        regular: 0, bonus: 0, leaves: 0, invites: 0
                    }
                );

                await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.regular`, 1);
                await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.invites`, 1);
            };

            await client.db.set(`${invite?.guild?.id}.USER.${member.user.id}.INVITES.BY`,
                {
                    inviter: inviter.id,
                    invite: invite?.code,
                }
            );

            var invitesAmount = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`);
            let joinMessage = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinmessage`);
            let wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);

            let channel = member.guild.channels.cache.get(wChan) as BaseGuildTextChannel;
            let msg = '';

            if (!wChan || !channel) return;

            if (!joinMessage) {

                msg = data.event_welcomer_inviter
                    .replace("${member.id}", member.id)
                    .replace("${member.user.createdAt.toLocaleDateString()}", member.user.createdAt.toLocaleDateString())
                    .replace("${member.guild.name}", member.guild.name)
                    .replace("${inviter.tag}", inviter.username)
                    .replace("${fetched}", invitesAmount);

            } else {

                msg = joinMessage
                    .replace("{user}", member.user.username)
                    .replace("{guild}", member.guild.name)
                    .replace("{createdat}", member.user.createdAt.toLocaleDateString())
                    .replace("{membercount}", member.guild.memberCount)
                    .replace("{inviter}", inviter.username)
                    .replace("{invites}", invitesAmount);

            };

            channel.send({ content: msg });
            return;

        } else if (member.guild.features.includes(GuildFeature.VanityURL)) {

            let msg = '';
            let VanityURL = await member.guild.fetchVanityData();
            let vanityInviteCache = client.vanityInvites.get(member.guild.id);

            client.vanityInvites.set(member.guild.id, VanityURL);

            let wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);
            let channel = member.guild.channels.cache.get(wChan) as BaseGuildTextChannel;

            if (!wChan || !channel) return;

            if (vanityInviteCache && vanityInviteCache.uses! < VanityURL.uses!) {

                msg = data.event_welcomer_inviter
                    .replace("${member.id}", member.id)
                    .replace("${member.user.createdAt.toLocaleDateString()}", member.user.createdAt.toLocaleDateString())
                    .replace("${member.guild.name}", member.guild.name)
                    .replace("${inviter.tag}", "/" + VanityURL.code)
                    .replace("${fetched}", VanityURL.uses);

                channel.send({ content: msg });
                return;

            };

        } else {

            let msg = '';
            let wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);
            let channel = member.guild.channels.cache.get(wChan) as BaseGuildTextChannel;

            if (!wChan || !channel) return;

            msg = data.event_welcomer_default
                .replace("${member.id}", member.id)
                .replace("${member.user.createdAt.toLocaleDateString()}", member.user.createdAt.toLocaleDateString())
                .replace("${member.guild.name}", member.guild.name)

            channel.send({ content: msg });
            return;
        };

    },
};
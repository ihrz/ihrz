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

import { BaseGuildTextChannel, Client, GuildFeature, GuildMember, Invite, PermissionsBitField, SnowflakeUtil } from 'pwss';
import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {
        let data = await client.func.getLanguageData(member.guild.id) as LanguageData;

        if (!member.guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;

        let oldInvites = client.invites.get(member.guild.id);
        let newInvites = await member.guild.invites.fetch();

        let invite = newInvites.find((i: Invite) => i.uses && i.uses > (oldInvites?.get(i.code) || 0));

        /**
         * Why doing this?
         * On iHorizon Production, we have some ~problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         */
        const nonce = SnowflakeUtil.generate().toString();

        if (invite) {
            let inviter = await client.users.fetch(invite?.inviterId!);
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
            let isCustomVanity = false; // Is discord.wf link
            let msg = '';

            if (!wChan || !channel) return;

            let CustomVanityInvite = await (client.db.table('API')).get(`VANITY.${member.guild.id}`)
            if (inviter.id === client.user?.id && CustomVanityInvite.invite === invite.code) {
                isCustomVanity = true;
            }

            if (!joinMessage) {
                msg = data.event_welcomer_inviter
                    .replaceAll("{memberUsername}", member.user.username)
                    .replaceAll("{memberMention}", member.user.toString())
                    .replaceAll('{memberCount}', member.guild.memberCount.toString()!)
                    .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                    .replaceAll('{guildName}', member.guild.name!)
                    .replaceAll('{inviterUsername}', isCustomVanity ? ".wf/" + CustomVanityInvite.vanity : inviter.username)
                    .replaceAll('{inviterMention}', isCustomVanity ? "discord.wf/" + CustomVanityInvite.vanity : inviter.toString())
                    .replaceAll('{invitesCount}', invitesAmount)
                    .replaceAll("\\n", '\n');
            } else {

                msg = joinMessage
                    .replaceAll("{memberUsername}", member.user.username)
                    .replaceAll("{memberMention}", member.user.toString())
                    .replaceAll('{memberCount}', member.guild.memberCount.toString()!)
                    .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                    .replaceAll('{guildName}', member.guild.name!)
                    .replaceAll('{inviterUsername}', isCustomVanity ? ".wf/" + CustomVanityInvite.vanity : inviter.username)
                    .replaceAll('{inviterMention}', isCustomVanity ? "discord.wf/" + CustomVanityInvite.vanity : inviter.toString())
                    .replaceAll('{invitesCount}', invitesAmount)
                    .replaceAll("\\n", '\n');
            };

            await channel.send({ content: msg, enforceNonce: true, nonce: nonce });
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
                    .replaceAll("{memberUsername}", member.user.username)
                    .replaceAll("{memberMention}", member.user.toString())
                    .replaceAll('{memberCount}', member.guild.memberCount.toString()!)
                    .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                    .replaceAll('{guildName}', member.guild.name!)
                    .replaceAll('{inviterUsername}', '.gg/' + VanityURL.code)
                    .replaceAll('{inviterMention}', VanityURL.code!)
                    .replaceAll('{invitesCount}', VanityURL.uses.toString()!)
                    .replaceAll("\\n", '\n');

                channel.send({ content: msg, enforceNonce: true, nonce: nonce });
                return;
            };

        } else {

            let msg = '';
            let wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);
            let channel = member.guild.channels.cache.get(wChan) as BaseGuildTextChannel;

            if (!wChan || !channel) return;

            msg = data.event_welcomer_default
                .replaceAll("{memberUsername}", member.user.username)
                .replaceAll("{memberMention}", member.user.toString())
                .replaceAll('{memberCount}', member.guild.memberCount.toString()!)
                .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                .replaceAll('{guildName}', member.guild.name!)
                .replaceAll('{invitesCount}', invitesAmount)
                .replaceAll("\\n", '\n');

            channel.send({ content: msg, enforceNonce: true, nonce: nonce });
            return;
        };

    },
};
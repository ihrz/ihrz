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

import { ActionRowBuilder, AttachmentBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonStyle, Client, ComponentBuilder, Guild, GuildChannel, GuildChannelManager, GuildFeature, GuildMember, GuildTextBasedChannel, Invite, Message, MessageManager, Role } from "discord.js";

import { PermissionsBitField } from 'discord.js';
import axios from 'axios';

import * as apiUrlParser from '../core/functions/apiUrlParser.js';
import logger from "../core/logger.js";

export default async (client: Client, member: GuildMember) => {

    let data = await client.functions.getLanguageData(member.guild.id);

    async function joinRoles() {
        if (!member?.guild?.members?.me?.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

        let roleid = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
        let role = member.guild.roles.cache.get(roleid);
        if (!roleid || !role) return;

        member.roles.add(roleid);
    };

    async function joinDm() {
        try {
            let msg_dm = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joindm`);
            if (!msg_dm || msg_dm === "off") return;

            let button = new ButtonBuilder()
                .setDisabled(true)
                .setCustomId('join-dm-from-server')
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`Message from ${member.guild.id}`);

            member.send({
                content: msg_dm,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(button)
                ]
            });
        } catch { return; };
    };

    async function blacklistFetch() {
        try {
            if (await client.db.get(`GLOBAL.BLACKLIST.${member.user.id}.blacklisted`)) {
                member.send({ content: "You've been banned, because you are blacklisted" })
                    .catch(() => { })
                    .then(() => {
                        member.ban({ reason: 'blacklisted!' });
                    });
            }
        } catch (error) {
            return;
        }
    };

    async function memberCount() {
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

    async function welcomeMessage() {
        // try {
        let oldInvites = client.invites.get(member.guild.id);
        let newInvites = await member.guild.invites.fetch();

        let invite = newInvites.find((i: Invite) => i.uses && i.uses > (oldInvites.get(i.code) || 0));

        if (invite) {
            let inviter = await client.users.fetch(invite?.inviterId as string);
            client.invites.get(member.guild.id).set(invite?.code, invite?.uses);

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
        }
    };

    async function blockBot() {
        if (await client.db.get(`${member.guild.id}.GUILD.BLOCK_BOT`) && member.user.bot) {
            member.ban({ reason: 'The BlockBot function are enable!' });
        };
    };

    async function securityCheck() {
        let baseData = await client.db.get(`${member.guild.id}.SECURITY`);
        if (!baseData || baseData?.disable === true) return;

        let data = await client.functions.getLanguageData(member.guild.id);
        let channel = member.guild.channels.cache.get(baseData?.channel);
        let request = (await axios.get(apiUrlParser.CaptchaURL))?.data;

        let sfbuff = Buffer.from((request?.image).split(",")[1], "base64");
        let sfattach = new AttachmentBuilder(sfbuff);

        (channel as GuildTextBasedChannel).send({
            content: data.event_security
                .replace('${member}', member),
            files: [sfattach]
        }).then(async (msg) => {
            let filter = (m: Message) => m.author.id === member.id;
            let collector = msg.channel.createMessageCollector({ filter: filter, time: 30000 });
            let passedtest = false;

            collector.on('collect', (m) => {
                m.delete();

                if (request.code === m.content) {
                    member.roles.add(baseData?.role);
                    msg.delete();
                    passedtest = true;
                    collector.stop();
                    return;
                } else {
                    // the member has failed the captcha 
                    msg.delete();
                    member.kick();
                    return;
                }
            });

            collector.on('end', (collected) => {
                if (passedtest) return;
                msg.delete();
                member.kick();
            });

        }).catch((error: any) => {
            logger.err(error);
        });
    };

    async function rolesSaver() {
        if (await client.db.get(`${member.guild.id}.GUILD_CONFIG.rolesaver.enable`)) {

            let array = await client.db.get(`${member.guild.id}.ROLE_SAVER.${member.user.id}`);

            array.forEach(async (role: Role) => {
                member.roles.add(role);
            });

            await client.db.delete(`${member.guild.id}.ROLE_SAVER.${member.user.id}`);
            return;
        }
    };

    blockBot(), joinRoles(), joinDm(), blacklistFetch(), memberCount(), welcomeMessage(), securityCheck(), rolesSaver();
};
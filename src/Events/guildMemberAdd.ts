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

import { AttachmentBuilder, Client, Guild, GuildChannel, GuildChannelManager, GuildMember, GuildTextBasedChannel, Invite, Message, MessageManager, Role } from "discord.js";

import { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent, Events, GuildBan } from 'discord.js';
import axios from 'axios';

import * as apiUrlParser from '../core/functions/apiUrlParser';

import logger from "../core/logger";

export = async (client: any, member: GuildMember) => {

    let data = await client.functions.getLanguageData(member.guild.id);

    async function joinRoles() {
        if (!member?.guild?.members?.me?.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

        let roleid = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
        let role = member.guild.roles.cache.get(roleid);
        if (!roleid || !role) return;

        member.roles.add(roleid).catch(() => { });
    };

    async function joinDm() {
        try {
            let msg_dm = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joindm`);

            if (!msg_dm || msg_dm === "off") return;
            member.send({ content: "**This is a Join DM from** \`" + member.guild.id + "\`**!**\n" + msg_dm });
        } catch { return; };
    };

    async function blacklistFetch() {
        try {
            if (await client.db.get(`GLOBAL.BLACKLIST.${member.user.id}.blacklisted`)) {
                member.send({ content: "You've been banned, because you are blacklisted" })
                    .catch(() => { })
                    .then(() => {
                        member.ban({ reason: 'blacklisted!' }).catch(() => { });
                    });
            }
        } catch (error) {
            return;
        }
    };

    async function memberCount() {
        try {
            let botMembers = member.guild.members.cache.filter((member: { user: { bot: any; }; }) => member.user.bot);
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

    function isVanity(invite: any) {
        return member.guild.features.includes("VANITY_URL") && invite.code == member.guild.vanityURLCode;
    };

    async function welcomeMessage() {
        try {
            let oldInvites = client.invites.get(member.guild.id);
            let newInvites = await member.guild.invites.fetch();

            let invite = newInvites.find((i: Invite) => i.uses && i.uses > (oldInvites.get(i.code) || 0));
            // if(invite.code == isVanity(invite.code)) { };

            let inviter = await client.users.fetch(invite?.inviterId);
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
                check = await client.db.get(`${invite?.guild?.id}.USER.${inviter.id}.INVITES`);
            };

            await client.db.set(`${invite?.guild?.id}.USER.${member.user.id}.INVITES.BY`,
                {
                    inviter: inviter.id,
                    invite: invite?.code,
                }
            );

            var invitesAmount = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`);

            let wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);
            if (!wChan || !client.channels.cache.get(wChan)) return;

            let joinMessage = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinmessage`);

            if (!joinMessage) {
                client.channels.cache.get(wChan).send({
                    content: data.event_welcomer_inviter
                        .replace("${member.id}", member.id)
                        .replace("${member.user.createdAt.toLocaleDateString()}", member.user.createdAt.toLocaleDateString())
                        .replace("${member.guild.name}", member.guild.name)
                        .replace("${inviter.tag}", inviter.username)
                        .replace("${fetched}", invitesAmount)
                }).catch(() => { });
                return;
            }

            var joinMessageFormated = joinMessage
                .replace("{user}", member.user.username)
                .replace("{guild}", member.guild.name)
                .replace("{createdat}", member.user.createdAt.toLocaleDateString())
                .replace("{membercount}", member.guild.memberCount)
                .replace("{inviter}", inviter.username)
                .replace("{invites}", invitesAmount);

            client.channels.cache.get(wChan).send({ content: joinMessageFormated }).catch(() => { });
            return;
        } catch (e: any) {
            let wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);
            if (!wChan || !client.channels.cache.get(wChan)) return;

            client.channels.cache.get(wChan).send({
                content: data.event_welcomer_default
                    .replace("${member.id}", member.id)
                    .replace("${member.user.createdAt.toLocaleDateString()}", member.user.createdAt.toLocaleDateString())
                    .replace("${member.guild.name}", member.guild.name)
            }).catch(() => { });
            return;
        }
    };

    async function blockBot() {
        if (await client.db.get(`${member.guild.id}.GUILD.BLOCK_BOT`) && member.user.bot) {
            member.ban({ reason: 'The BlockBot function are enable!' }).catch(() => { });
        };
    };

    async function securityCheck() {
        let baseData = await client.db.get(`${member.guild.id}.SECURITY`);
        if (!baseData
            || baseData?.disable === true) return;

        let data = await client.functions.getLanguageData(member.guild.id);
        let channel = member.guild.channels.cache.get(baseData?.channel);
        let request = (await axios.get(apiUrlParser.CaptchaURL))?.data;

        let sfbuff = Buffer.from((request?.image).split(",")[1], "base64");
        let sfattach = new AttachmentBuilder(sfbuff);

        (channel as GuildTextBasedChannel).send({
            content: data.event_security
                .replace('${member}', member),
            files: [sfattach]
        }).then(async (msg: any) => {
            let filter = (m: Message) => m.author.id === member.id;
            let collector = msg.channel.createMessageCollector({ filter: filter, time: 30000 });
            let passedtest = false;

            collector.on('collect', (m: any) => {

                m.delete().catch(() => { });
                if (request.text === m.content) {
                    member.roles.add(baseData?.role).catch(() => { });
                    msg.delete().catch(() => { });
                    passedtest = true;
                    collector.stop();
                    return;
                } else {
                    // the member has failed the captcha 
                    msg.delete().catch(() => { });
                    member.kick().catch(() => { });
                    return;
                }
            });

            collector.on('end', (collected: { size: any; }) => {
                if (passedtest) return;
                msg.delete().catch(() => { });
                member.kick().catch(() => { });
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
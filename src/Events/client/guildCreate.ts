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

import { Collection, EmbedBuilder, PermissionsBitField, Guild, GuildTextBasedChannel, Client, BaseGuildTextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'pwss';

import logger from "../../core/logger.js";

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "guildCreate",
    run: async (client: Client, guild: Guild) => {
        if (!guild) return;

        let channel = guild.channels.cache.get(guild?.systemChannelId!)
            || guild.channels.cache.first();

        // async function antiPoubelle() {
        //   let embed = new EmbedBuilder()
        //     .setColor("#f44336")
        //     .setTimestamp()
        //     .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`)
        //     .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
        //     .setDescription(`Dear members of this server,
        // We regret to inform you that our bot will be leaving this server. We noticed that this server has less than 10 members, which may suggest that it is not an active and healthy community for our bot to be a part of.
        // We value the safety and satisfaction of our users, and we believe that being part of active and thriving communities is essential to achieving this goal. We apologize for any inconvenience this may cause and we hope to have the opportunity to serve you in a more suitable environment in the future.

        // Thank you for your understanding and have a great day.
        // Best regards,
        // iHorizon Project`);

        //   if (!guild.memberCount) {
        //     if (channel) { channel.send({ embeds: [embed] }).catch(err => { }); };
        //     await guild.leave();
        //     return false;
        //   };
        //   return true;
        // };

        async function blacklistLeave() {
            let channelHr = guild.channels.cache.get((guild.systemChannelId as string))
                || guild.channels.cache.random();

            let tqtmonreuf = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`Dear <@${guild.ownerId}>, I'm sorry, but you have been blacklisted by the bot.\nAs a result, I will be leaving your server. If you have any questions or concerns, please contact my developer.\n\nThank you for your understanding`)
                .setTimestamp()
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })

            let table = client.db.table('BLACKLIST')
            let isBL = await table.get(`${guild.ownerId}.blacklisted`) || false;

            if (isBL) {
                await (channelHr as GuildTextBasedChannel).send({
                    embeds: [tqtmonreuf],
                    files: [{ attachment: await client.func.image64(client.user?.displayAvatarURL()), name: 'icon.png' }]
                }).catch(() => { });
                await guild.leave();
                return false;
            } else {
                return true;
            }
        }

        async function messageToServer() {
            let welcomeMessage = [
                "Welcome to our server! 🎉",
                "Greetings, fellow Discordians! 👋",
                "iHorizon has joined the chat! 💬",
                "It's a bird, it's a plane, no, it's iHorizon! 🦸‍♂",
                "Let's give a warm welcome to iHorizon! 🔥",
            ];

            let embed = new EmbedBuilder()
                .setColor(2829617)
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setDescription(
                    `## ${welcomeMessage[Math.floor(Math.random() * welcomeMessage.length)]}\n` +
                    `Hi there! I'm excited to join your server and be a part of your community.\n` +
                    `My name is iHorizon and I'm here to help you with all your needs. Feel free to use my commands and explore all the features I have to offer.\n` +
                    `If you have any questions or run into any issues, don't hesitate to reach out to me.\n` +
                    `I'm here to make your experience on this server the best it can be.\n` +
                    `Thanks for choosing me and let's have some fun together!\n`
                )
                .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await guild.client.db.get(`${guild.id}.GUILD.LANG.lang`) || 'en-US'}.png`);

            let buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setEmoji(client.iHorizon_Emojis.icon.Crown_Logo)
                        .setLabel('Invite iHorizon')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot`),
                    new ButtonBuilder()
                        .setEmoji(client.iHorizon_Emojis.icon.Sparkles)
                        .setLabel('iHorizon Website')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://ihorizon.me'),
                )
                ;

            if (!channel) return;

            (channel as TextChannel).send({
                embeds: [embed],
                content: 'discord.gg/ihorizon\ndiscord.com/application-directory/945202900907470899',
                files: [{ attachment: await client.func.image64(client.user?.displayAvatarURL()), name: 'icon.png' }],
                components: [buttons]
            }).catch(() => { });
        }

        async function getInvites() {
            if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
            try {
                guild.invites.fetch().then((guildInvites) => {
                    client.invites.set(guild.id, new Collection(guildInvites.map((invite) => [invite.code, invite.uses])));
                });
            } catch (error: any) { logger.err(error) }
        }

        async function ownerLogs() {
            let i: string = '';
            if (guild.vanityURLCode) { i = 'discord.gg/' + guild.vanityURLCode; }

            let channel = guild.channels.cache.get((guild.systemChannelId as string)) || guild.channels.cache.random();

            async function createInvite(channel: BaseGuildTextChannel) {
                try {
                    let invite = await channel.createInvite();
                    let inviteCode = invite.code;

                    return 'discord.gg/' + inviteCode;
                } catch {
                    return 'None';
                }
            }

            let embed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTimestamp(guild.joinedTimestamp)
                .setDescription(`**A new guild added iHorizon !**`)
                .addFields({ name: "🏷️・Server Name", value: `\`${guild.name}\``, inline: true },
                    { name: "🆔・Server ID", value: `\`${guild.id}\``, inline: true },
                    { name: "🌐・Server Region", value: `\`${guild.preferredLocale}\``, inline: true },
                    { name: "👤・Member Count", value: `\`${guild.memberCount}\` members`, inline: true },
                    { name: "🔗・Invite Link", value: `\`${await createInvite(channel as BaseGuildTextChannel)}\``, inline: true },
                    { name: "🪝・Vanity URL", value: `\`${i || "None"}\``, inline: true },
                    { name: "🍻 new guilds total", value: client.guilds.cache.size.toString(), inline: true }
                )
                .setThumbnail(guild.iconURL())
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

            let logsChannel: TextChannel | null = client.channels.cache.get(client.config.core.guildLogsChannelID) as TextChannel;

            logsChannel?.send({
                embeds: [embed],
                files: [{ attachment: await client.func.image64(client.user?.displayAvatarURL()), name: 'icon.png' }]
            }).catch(() => { });
        };

        // let c = await antiPoubelle();
        let d = await blacklistLeave();
        if (d) ownerLogs(), messageToServer(), getInvites();
    },
};
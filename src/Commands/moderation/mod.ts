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

import {
    Client,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
    ChannelType,
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms, { StringValue } from 'ms';

export const command: Command = {
    name: "mod",
    description: "Subcommand for moderation category!",
    options: [
        {
            name: "avatar",
            description: "Pick the avatar of a user!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user',
                    required: false
                }
            ],
        },
        {
            name: 'ban',
            description: 'Ban a user!',
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to ban',
                    required: true
                }
            ],
        },
        {
            name: 'clear',
            description: 'Clear a amount of message in the channel !',
            type: 1,
            options: [
                {
                    name: 'number',
                    type: ApplicationCommandOptionType.Number,
                    description: 'The number of message you want to delete !',
                    required: true
                }
            ],
        },
        {
            name: 'kick',
            description: 'Kick a user!',
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to kick',
                    required: true
                }
            ],
        },
        {
            name: 'lock',
            description: 'Remove ability to speak of all users in this text channel!',
            type: 1,
        },
        {
            name: 'lock-all',
            description: 'Remove ability to speak of all users in all channels!',
            type: 1
        },
        {
            name: 'tempmute',
            description: 'Temporarily mute a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to unmuted',
                    required: true
                },
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,
                    description: 'the duration of the user\'s tempmute',
                    required: true
                }
            ],
        },
        {
            name: 'unban',
            description: 'Unban a user!',
            type: 1,
            options: [
                {
                    name: 'userid',
                    type: ApplicationCommandOptionType.String,
                    description: 'The id of the user you wan\'t to unban !',
                    required: true
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,
                    description: 'The reason for unbanning this user.',
                    required: false
                }
            ],
        },
        {
            name: 'unlock',
            description: 'Give ability to speak of all users in this text!',
            type: 1
        },
        {
            name: 'unmute',
            description: 'Unmute a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to unmuted',
                    required: true
                }
            ],
        }
    ],
    category: 'moderation',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'avatar') {

            let mentionedUser = interaction.options.getUser("user") || interaction.user;

            let embed = new EmbedBuilder()
                .setImage(mentionedUser.avatarURL({ format: 'png', dynamic: true, size: 512 }))
                .setColor("#add5ff")
                .setTitle(data.avatar_embed_title
                    .replace('${mentionedUser.username}', mentionedUser.username)
                )
                .setDescription(data.avatar_embed_description)
                .setTimestamp()
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

            return interaction.reply({ embeds: [embed] })

        } else if (command === 'ban') {

            let member = interaction.guild.members.cache.get(interaction.options.get("member").user.id)
            let permission = interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)
            if (!permission) return interaction.reply({ content: data.ban_not_permission });
            if (!member) return interaction.reply({ content: data.ban_dont_found_member });

            if (!interaction.channel.permissionsFor(client.user).has('BAN_MEMBERS')) {
                return interaction.reply({ content: data.ban_dont_have_perm_myself })
            }

            if (member.user.id === interaction.member.id) { return interaction.reply({ content: data.ban_try_to_ban_yourself }) };
            if (interaction.member.roles.highest.position < member.roles.highest.position) {
                return interaction.reply({ content: data.ban_attempt_ban_higter_member });
            }

            if (!member.bannable) {
                return interaction.reply({ content: data.ban_cant_ban_member });
            }
            member.send({
                content: data.ban_message_to_the_banned_member
                    .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                    .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
            })
                .catch(() => { })
                .then(() => {
                    member.ban({ reason: 'banned by ' + interaction.user.username })
                        .then((member: { user: { id: any; }; }) => {
                            interaction.reply({
                                content: data.ban_command_work
                                    .replace(/\${member\.user\.id}/g, member.user.id)
                                    .replace(/\${interaction\.member\.id}/g, interaction.member.id)
                            })
                                .catch(() => { });

                            try {
                                let logEmbed = new EmbedBuilder()
                                    .setColor("#bf0bb9")
                                    .setTitle(data.ban_logs_embed_title)
                                    .setDescription(data.ban_logs_embed_description
                                        .replace(/\${member\.user\.id}/g, member.user.id)
                                        .replace(/\${interaction\.member\.id}/g, interaction.member.id)
                                    )
                                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                            } catch (e: any) { logger.err(e) };
                        })
                });

        } else if (command === 'clear') {

            let permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
            var numberx = interaction.options.getNumber("number") + 1;
            if (!permission) return interaction.reply({ content: data.clear_dont_have_permission });
            if (numberx > 98) { return interaction.reply({ content: data.clear_max_message_limit }) };

            interaction.channel.bulkDelete(numberx, true)
                .then((messages: { size: any; }) => {
                    interaction.reply({
                        content: data.clear_confirmation_message
                            .replace(/\${messages\.size}/g, messages.size)
                    })

                    try {
                        let logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.clear_logs_embed_title)
                            .setDescription(data.clear_logs_embed_description
                                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                                .replace(/\${messages\.size}/g, messages.size)
                                .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
                            )
                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
                    } catch (e: any) { logger.err(e) };
                });

        } else if (command === 'kick') {

            let member = interaction.options.getMember("member");
            let permission = interaction.member.permissions.has([PermissionsBitField.Flags.KickMembers]);

            if (!permission) {
                return interaction.reply({ content: data.kick_not_permission });
            };

            if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.KickMembers])) {
                return interaction.reply({ content: data.kick_dont_have_permission });
            };

            if (member.user.id === interaction.member.id) {
                return interaction.reply({ content: data.kick_attempt_kick_your_self });
            };

            if (interaction.member.roles.highest.position < member.roles.highest.position) {
                return interaction.reply({ content: data.kick_attempt_kick_higter_member });
            };

            member.send({
                content: data.kick_message_to_the_banned_member
                    .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                    .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
            }).catch(() => { });

            try {
                await member.kick({ reason: 'kicked by ' + interaction.user.username });

                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.kick_logs_embed_title)
                    .setDescription(data.kick_logs_embed_description
                        .replace(/\${member\.user}/g, member.user)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    );

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }

                await interaction.reply({
                    content: data.kick_command_work
                        .replace(/\${member\.user}/g, member.user)
                        .replace(/\${interaction\.user}/g, interaction.user)
                });
            } catch (e: any) {
                logger.err(e);
            };

        } else if (command === 'lock') {

            let Lockembed = new EmbedBuilder()
                .setColor("#5b3475")
                .setTimestamp()
                .setDescription(data.lock_embed_message_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                );

            let permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
            if (!permission) return interaction.reply({ content: data.lock_dont_have_permission });

            interaction.channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: false }).then(() => {
                interaction.reply({ embeds: [Lockembed] })
            }).catch(() => { })
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.lock_logs_embed_title)
                    .setDescription(data.lock_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { return };

        } else if (command === 'lock-all') {

            let permission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            if (!permission) return interaction.reply({ content: data.lockall_dont_have_permission });
            interaction.guild.channels.cache.forEach((c: { type: ChannelType; permissionOverwrites: { create: (arg0: any, arg1: { SendMessages: boolean; }) => void; }; }) => {
                if (c.type === ChannelType.GuildText) { c.permissionOverwrites.create(interaction.guild.id, { SendMessages: false }) };
            })
            let Lockembed = new EmbedBuilder()
                .setColor("#5b3475")
                .setTimestamp()
                .setDescription(data.lockall_embed_message_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                );

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.lockall_logs_embed_title)
                    .setDescription(data.lockall_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    );

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            return interaction.reply({ embeds: [Lockembed] });

        } else if (command === 'tempmute') {

            await interaction.reply({ content: ':clock:' });

            let mutetime: any = interaction.options.getString("time").split(" ")[0];
            let tomute = interaction.options.getMember("user");

            let permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

            if (!permission) return interaction.editReply({ content: data.tempmute_dont_have_permission });

            if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageMessages])) {
                return interaction.editReply({ content: data.tempmute_i_dont_have_permission })
            };

            if (tomute.id === interaction.user.id) {
                return interaction.editReply({ content: data.tempmute_cannot_mute_yourself });
            }
            let muterole = interaction.guild.roles.cache.find((role: { name: string; }) => role.name === 'muted');

            if (!muterole) {
                try {
                    muterole = await interaction.guild.roles.create({
                        name: "muted",
                        reason: data.tempmute_reason_create_roles
                    })

                    await interaction.guild.channels.cache.forEach(async (channel: { permissionOverwrites: { create: (arg0: any, arg1: { SendMessages: boolean; AddReactions: boolean; SendMessagesInThreads: boolean; }) => any; }; }, id: any) => {
                        if (channel.permissionOverwrites) {
                            await channel.permissionOverwrites.create(muterole, {
                                SendMessages: false,
                                AddReactions: false,
                                SendMessagesInThreads: false
                            });
                        }
                    });
                } catch (e) { };
            }
            if (tomute.roles.cache.has(muterole.id)) {
                return interaction.editReply({ content: data.tempmute_already_muted })
            }
            await (tomute.roles.add(muterole.id));
            await interaction.editReply(data.tempmute_command_work
                .replace("${tomute.id}", tomute.id)
                .replace("${ms(ms(mutetime))}", ms(ms(mutetime)))
            );

            setTimeout(async () => {
                if (!tomute.roles.cache.has(muterole.id)) {
                    return;
                }

                tomute.roles.remove(muterole.id);
                await interaction.channel.send({
                    content: data.tempmute_unmuted_by_time.replace("${tomute.id}", tomute.id),
                });
            }, ms(mutetime as StringValue));
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.tempmute_logs_embed_title)
                    .setDescription(data.tempmute_logs_embed_description
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${tomute.id}", tomute.id)
                        .replace("${ms(ms(mutetime))}", ms(ms(mutetime)))
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

        } else if (command === 'unban') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.reply({ content: data.unban_dont_have_permission });
            };

            if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.BanMembers])) {
                return interaction.reply({ content: data.unban_bot_dont_have_permission })
            };

            let userID = interaction.options.getString('userid');
            let reason = interaction.options.getString('reason');
            if (!reason) reason = "No reason was provided."

            await interaction.guild.bans.fetch()
                .then(async (bans: { size: number; find: (arg0: (ban: any) => boolean) => any; }) => {
                    if (bans.size == 0) {
                        return await interaction.reply({ content: data.unban_there_is_nobody_banned });
                    }
                    let bannedID = bans.find(ban => ban.user.id == userID);
                    if (!bannedID) return await interaction.reply({ content: data.unban_the_member_is_not_banned });
                    await interaction.guild.bans.remove(userID, reason).catch((err: string) => logger.err(err));
                    await interaction.reply({
                        content: data.unban_is_now_unbanned
                            .replace(/\${userID}/g, userID)
                    })
                })
                .catch((err: string) => logger.err(err));

            try {
                let logEmbed = new EmbedBuilder().setColor("#bf0bb9").setTitle("")
                    .setDescription(data.unban_logs_embed_description
                        .replace(/\${userID}/g, userID)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e); };

        } else if (command === 'unlock') {

            let permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            if (!permission) return interaction.reply({ content: data.unlock_dont_have_permission });
            let embed = new EmbedBuilder()
                .setColor("#5b3475")
                .setTimestamp()
                .setDescription(data.unlock_embed_message_description);
            await interaction.channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: true });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.unlock_logs_embed_title)
                    .setDescription(data.unlock_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            return interaction.reply({ embeds: [embed] });

        } else if (command === 'unmute') {

            let tomute = interaction.options.getMember("user");
            let permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

            if (!permission) return interaction.reply({ content: data.unmute_dont_have_permission });
            if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageRoles])) {
                return interaction.reply({ content: data.unmute_i_dont_have_permission });
            };
            if (tomute.id === interaction.user.id) return interaction.reply({ content: data.unmute_attempt_mute_your_self });
            let muterole = interaction.guild.roles.cache.find((role: { name: string; }) => role.name === 'muted');

            if (!tomute.roles.cache.has(muterole.id)) {
                return interaction.reply({ content: data.unmute_not_muted })
            };

            if (!muterole) {
                return interaction.reply({ content: data.unmute_muted_role_doesnt_exist })
            };

            tomute.roles.remove(muterole.id);
            await interaction.reply({
                content: data.unmute_command_work
                    .replace("${tomute.id}", tomute.id)
            });
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.unmute_logs_embed_title)
                    .setDescription(data.unmute_logs_embed_description
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${tomute.id}", tomute.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }); };
            } catch (e: any) { logger.err(e) };

        };
    },
}
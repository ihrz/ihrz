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
    PermissionFlagsBits,
    ChannelType,
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms from 'ms';

export const command: Command = {
    name: "guildconfig",
    description: "Subcommand for guildconfig category!",
    options: [
        {
            name: 'setup',
            description: 'Setup the logs channel about the bot!',
            type: 1
        },
        {
            name: 'block',
            description: 'Block/Protect someting/behaviours into this guild!',
            type: 2,
            options: [
                {
                    name: 'pub',
                    description: 'Allow/Unallow the user to send a advertisement into them messages!',
                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,
                            description: 'What you want to do?',
                            required: true,
                            choices: [
                                {
                                    name: "Disable the spam protection",
                                    value: "off"
                                },
                                {
                                    name: 'Enable the spam protection',
                                    value: "on"
                                },
                            ],
                        },
                    ],
                },
                {
                    name: 'bot',
                    description: 'Block the ability to add new bots into this server',
                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,
                            description: 'What you want to do?',
                            required: true,
                            choices: [
                                {
                                    name: 'Power On',
                                    value: "on"
                                },
                                {
                                    name: "Power Off",
                                    value: "off"
                                }
                            ],
                        }
                    ],
                }
            ],
        },
        {
            name: 'show',
            description: 'Get the guild configuration!',
            type: 1,
        },
        {
            name: 'set',
            description: 'Set someting/behaviours into this guild!',
            type: 2,
            options: [
                {
                    name: 'channel',
                    description: 'Set the channel where the bot will send message when user leave/join guild!',
                    type: 1,
                    options: [
                        {
                            name: 'type',
                            type: ApplicationCommandOptionType.String,
                            description: '<On join/On leave/Delete all settings>',
                            required: true,
                            choices: [
                                {
                                    name: "On join",
                                    value: "join"
                                },
                                {
                                    name: "On leave",
                                    value: "leave"
                                },
                                {
                                    name: "Delete all settings",
                                    value: "off"
                                }
                            ]
                        },
                        {
                            name: 'channel',
                            type: ApplicationCommandOptionType.Channel,
                            description: "The channel you wan't your welcome/goodbye message !",
                            required: false
                        }
                    ],
                },
                {
                    name: 'join-dm',
                    description: 'Set a join dm message when user join the guild!',
                    type: 1,
                    options: [
                        {
                            name: "value",
                            description: "Choose the action you want to do",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "on"
                                },
                                {
                                    name: "Power off",
                                    value: "off"
                                },
                                {
                                    name: "Show the message set",
                                    value: "ls"
                                }
                            ]
                        },
                        {
                            name: 'message',
                            type: ApplicationCommandOptionType.String,
                            description: '<Message if the first args is on>',
                            required: false
                        }
                    ],
                },
                {
                    name: 'join-message',
                    description: 'Set a join message when user join the guild!',
                    type: 1,
                    options: [
                        {
                            name: "value",
                            description: "<Power on /Power off/Show the message set>",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "on"
                                },
                                {
                                    name: "Power off",
                                    value: "off"
                                },
                                {
                                    name: "Show the message set",
                                    value: "ls"
                                },
                                {
                                    name: "Need help",
                                    value: "needhelp"
                                }
                            ]
                        },
                        {
                            name: 'message',
                            type: ApplicationCommandOptionType.String,
                            description: `{user}:username| {membercount}:guild member count| {createdat}:user create date| {guild}:Guild name`,
                            required: false
                        },
                    ],
                },
                {
                    name: 'join-role',
                    description: 'Set a join roles when user join the guild!',
                    type: 1,
                    options: [
                        {
                            name: "value",
                            description: "<Power on /Power off/Show the message set>",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "true"
                                },
                                {
                                    name: "Power off",
                                    value: "false"
                                },
                                {
                                    name: "Show the roles set",
                                    value: "ls"
                                },
                                {
                                    name: "Need help",
                                    value: "needhelp"
                                }
                            ]
                        },
                        {
                            name: 'roles',
                            type: ApplicationCommandOptionType.Role,
                            description: '<roles id>',
                            required: false
                        }
                    ],
                },
                {
                    name: 'leave-message',
                    description: 'Set a leave message when user leave the guild!',
                    type: 1,
                    options: [
                        {
                            name: "value",
                            description: "<Power on /Power off/Show the message set>",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "on"
                                },
                                {
                                    name: "Power off",
                                    value: "off"
                                },
                                {
                                    name: "Show the message set",
                                    value: "ls"
                                },
                                {
                                    name: "Need help",
                                    value: "needhelp"
                                }
                            ]
                        },
                        {
                            name: 'message',
                            type: ApplicationCommandOptionType.String,
                            description: `{user} = Username of Member | {membercount} = guild's member count | {guild} = The name of the guild`,
                            required: false
                        },
                    ],
                }
            ],
        },
    ],
    category: 'guildconfig',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'pub') {

            let turn = interaction.options.getString("action");

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.blockpub_not_admin });
            }
            if (turn === "on") {
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, value: "on" })
                return interaction.reply({ content: data.blockpub_now_enable })
            }

            if (turn === "off") {
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, value: "off" })
                return interaction.reply({ content: data.blockpub_now_disable })
            };

        } else if (command === 'bot') {

            let action = interaction.options.getString('action');

            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: data.blockbot_not_owner });
            };

            if (action === 'on') {

                // ------------------------
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.blockbot_logs_enable_title)
                        .setDescription(data.blockbot_logs_enable_description
                            .replace(/\${interaction\.user}/g, interaction.user)
                        );

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
                } catch (e: any) { logger.err(e) };
                // ------------------------

                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.BLOCK_BOT`, value: true });

                return interaction.reply({ content: data.blockbot_command_work_on_enable });
            } else if (action === 'off') {

                // ------------------------
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.blockbot_logs_disable_commmand_work)
                        .setDescription(data.blockbot_logs_disable_description
                            .replace(/\${interaction\.user}/g, interaction.user)
                        );

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
                } catch (e: any) { logger.err(e) };
                // ------------------------

                await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.BLOCK_BOT` });

                return interaction.reply({ content: data.blockbot_command_work_on_disable });
            };

        } else if (command === 'show') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.guildprofil_not_admin });
            }

            let setchannelsjoin = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` })
            let setchannelsleave = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` })
            let joinroles = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles` });
            let joinDmMessage = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm` })
            let blockpub = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub` })
            let joinmessage = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage` })
            let leavemessage = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage` })
            let punishPub = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB` })
            let supportConfig = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.SUPPORT` })
            let reactionrole;
            var text2: string = '';
            var ticketFetched;
            var text: string = '';

            try {
                const dbAll = await db.DataBaseModel({ id: db.All });
                const foundArray = dbAll.findIndex((ticketList: { id: any; }) => ticketList.id === interaction.guild.id)

                const charForTicket = dbAll[foundArray].value.GUILD.TICKET;
                const charForRr = dbAll[foundArray].value.GUILD.REACTION_ROLES;

                for (var i in charForTicket) {
                    var a = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.${i}` })
                    if (a) {
                        text += `**${a.panelName}**: <#${a.channel}>\n`;
                    };
                };

                for (var i in charForRr) {
                    var a = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.REACTION_ROLES.${i}` })

                    if (a) {
                        const stringContent = Object.keys(a).map((key) => {
                            const rolesID = a[key].rolesID;
                            var emoji = interaction.guild.emojis.cache.find((emoji: { id: string; }) => emoji.id === key);

                            return data.guildprofil_set_reactionrole
                                .replace(/\${rolesID}/g, rolesID)
                                .replace(/\${emoji\s*\|\|\s*key}/g, emoji || key)
                                .replace(/\${i}/g, i);
                        }).join('\n');
                        text2 = stringContent;
                    };
                };
            } catch (e) { };

            if (!text2 || text2 == '') {
                reactionrole = data.guildprofil_not_set_reactionrole
            } else { reactionrole = text2 };

            if (!text || text == '') {
                ticketFetched = data.guildprofil_not_set_ticketFetched
            } else { ticketFetched = text };

            if (!punishPub || punishPub === null) {
                punishPub = data.guildprofil_not_set_punishPub
            } else {
                punishPub = data.guildprofil_set_punishPub
                    .replace(/\${punishPub\.punishementType}/g, punishPub.punishementType)
                    .replace(/\${punishPub\.amountMax}/g, punishPub.amountMax)
            }

            if (!supportConfig || supportConfig === null) {
                supportConfig = data.guildprofil_not_set_supportConfig
            } else {
                supportConfig = data.guildprofil_set_supportConfig
                    .replace(/\${supportConfig\.input}/g, supportConfig.input)
                    .replace(/\${supportConfig\.rolesId}/g, supportConfig.rolesId)
            }

            if (!setchannelsjoin || setchannelsjoin === null) {
                setchannelsjoin = data.guildprofil_not_set_setchannelsjoin
            } else { setchannelsjoin = `<#${setchannelsjoin}>` }

            if (!setchannelsleave || setchannelsleave === null) {
                setchannelsleave = data.guildprofil_not_set_setchannelsleave
            } else { setchannelsleave = `<#${setchannelsleave}>` }

            if (!joinmessage || joinmessage == null) {
                joinmessage = data.guildprofil_not_set_joinmessage
            }
            if (!leavemessage || leavemessage == null) {
                leavemessage = data.guildprofil_not_set_leavemessage
            }

            if (!joinroles || joinroles === null) {
                joinroles = data.guildprofil_not_set_joinroles
            } else { joinroles = `<@&${joinroles}>` }

            if (!joinDmMessage || joinDmMessage === null) {
                joinDmMessage = data.guildprofil_not_set_joinDmMessage
            }

            if (blockpub != "on") {
                blockpub = data.guildprofil_not_set_blockpub
            } else { blockpub = data.guildprofil_set_blockpub }

            let guildc = new EmbedBuilder()
                .setColor("#016c9a")
                .setDescription(data.guildprofil_embed_description
                    .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                )
                .addFields(
                    { name: data.guildprofil_embed_fields_joinmessage, value: joinmessage, inline: true },
                    { name: data.guildprofil_embed_fields_leavemessage, value: leavemessage, inline: true },
                    { name: data.guildprofil_embed_fields_setchannelsjoin, value: setchannelsjoin, inline: true },
                    { name: data.guildprofil_embed_fields_setchannelsleave, value: setchannelsleave, inline: true },
                    { name: data.guildprofil_embed_fields_joinroles, value: joinroles, inline: true },
                    { name: data.guildprofil_embed_fields_joinDmMessage, value: joinDmMessage, inline: true },
                    { name: data.guildprofil_embed_fields_blockpub, value: blockpub, inline: true },
                    { name: data.guildprofil_embed_fields_punishPub, value: punishPub, inline: true },
                    { name: data.guildprofil_embed_fields_supportConfig, value: supportConfig, inline: true },
                    { name: data.guildprofil_embed_fields_ticketFetched, value: ticketFetched, inline: true },
                    { name: data.guildprofil_embed_fields_reactionrole, value: reactionrole, inline: true })
                .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`)
            return interaction.reply({ embeds: [guildc] });

        } else if (command === 'channel') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setchannels_not_admin });
            }

            let type = interaction.options.getString("type");
            let argsid = interaction.options.getChannel("channel");

            if (type === "join") {
                if (!argsid) return interaction.reply({ content: data.setchannels_not_specified_args })

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setchannels_logs_embed_title_on_join)
                        .setDescription(data.setchannels_logs_embed_description_on_join
                            .replace(/\${argsid\.id}/g, argsid.id)
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };

                try {
                    let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` })
                    if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_join })
                    interaction.client.channels.cache.get(argsid.id).send({ content: data.setchannels_confirmation_message_on_join })
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join`, value: argsid.id })

                    return interaction.reply({
                        content: data.setchannels_command_work_on_join
                            .replace(/\${argsid\.id}/g, argsid.id)
                    });
                } catch (e) {
                    interaction.reply({ content: data.setchannels_command_error_on_join });
                }
            }

            if (type === "leave") {
                try {
                    if (!argsid) return interaction.reply({ content: data.setchannels_not_specified_args });
                    let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });

                    if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_leave })
                    interaction.client.channels.cache.get(argsid.id)?.send({ content: data.setchannels_confirmation_message_on_leave })
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`, value: argsid.id });

                    try {
                        let logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setchannels_logs_embed_title_on_leave)
                            .setDescription(data.setchannels_logs_embed_description_on_leave
                                .replace(/\${argsid\.id}/g, argsid.id)
                                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            )

                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                    } catch (e: any) { logger.err(e) };

                    return interaction.reply({
                        content: data.setchannels_command_work_on_leave
                            .replace(/\${argsid\.id}/g, argsid.id)
                    });

                } catch (e) {
                    return interaction.reply({ content: data.setchannels_command_error_on_leave });
                }
            }
            if (type === "off") {
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setchannels_logs_embed_title_on_off)
                        .setDescription(data.setchannels_logs_embed_description_on_off
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
                } catch (e: any) { logger.err(e) };

                let leavec: string = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
                let joinc: string = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
                if (!joinc && !leavec) return interaction.reply({ content: data.setchannels_already_on_off });

                await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
                await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
                return interaction.reply({ content: data.setchannels_command_work_on_off });
            };

        } else if (command === 'join-dm') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setjoindm_not_admin });
            };

            let type = interaction.options.getString("value");
            let dm_msg = interaction.options.getString("message");

            if (type === "on") {
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setjoindm_logs_embed_title_on_enable)
                        .setDescription(data.setjoindm_logs_embed_description_on_enable
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };

                try {
                    if (!dm_msg) return interaction.reply({ content: data.setjoindm_not_specified_args_on_enable })
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`, value: dm_msg });
                    return interaction.reply({
                        content: data.setjoindm_confirmation_message_on_enable
                            .replace(/\${dm_msg}/g, dm_msg)
                    });
                } catch (e) {
                    interaction.reply({ content: data.setjoindm_command_error_on_enable });
                }
            }

            if (type === "off") {
                try {
                    let ban_embed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setjoindm_logs_embed_title_on_disable)
                        .setDescription(data.setjoindm_logs_embed_description_on_disable
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )
                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    logchannel.send({ embeds: [ban_embed] })
                } catch (e) {
                    return;
                }

                try {
                    let already_off = await db.DataBaseModel({ id: db.Get, key: `joindm-${interaction.guild.id}` });
                    if (already_off === "off") return interaction.reply({ content: data.setjoindm_already_disable });
                    await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm` });
                    return interaction.reply({ content: data.setjoindm_confirmation_message_on_disable });

                } catch (e) {
                    interaction.reply({ content: data.setjoindm_command_error_on_disable });
                }
            }
            if (type === "ls") {
                let already_off = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm` });
                if (already_off === null) {
                    return interaction.reply({ content: data.setjoindm_not_setup_ls })
                };

                return interaction.reply({
                    content: data.setjoindm_command_work_ls
                        .replace(/\${already_off}/g, already_off)
                })
            };

        } else if (command === 'join-message') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setjoinmessage_not_admin });
            };

            let type = interaction.options.getString("value");
            let messagei = interaction.options.getString("message");

            let help_embed = new EmbedBuilder()
                .setColor("#0014a8")
                .setTitle(data.setjoinmessage_help_embed_title)
                .setDescription(data.setjoinmessage_help_embed_description)
                .addFields({
                    name: data.setjoinmessage_help_embed_fields_name,
                    value: data.setjoinmessage_help_embed_fields_value
                })

            if (type == "on") {
                if (messagei) {
                    let joinmsgreplace = messagei
                        .replace("{user}", "{user}")
                        .replace("{guild}", "{guild}")
                        .replace("{createdat}", "{createdat}")
                        .replace("{membercount}", "{membercount}")
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`, value: joinmsgreplace });

                    try {
                        let logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setjoinmessage_logs_embed_title_on_enable)
                            .setDescription(data.setjoinmessage_logs_embed_description_on_enable
                                .replace("${interaction.user.id}", interaction.user.id)
                            )

                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                    } catch (e) { };

                    return interaction.reply({ content: data.setjoinmessage_command_work_on_enable });
                }
            } else {
                if (type == "off") {
                    await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage` });
                    try {
                        const logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setjoinmessage_logs_embed_title_on_disable)
                            .setDescription(data.setjoinmessage_logs_embed_description_on_disable
                                .replace("${interaction.user.id}", interaction.user.id)
                            )

                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                    } catch (e) { };

                    return interaction.reply({ content: data.setjoinmessage_command_work_on_disable })
                }
            }
            if (type == "ls") {
                var ls = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage` });
                return interaction.reply({
                    content: data.setjoinmessage_command_work_ls
                        .replace("${ls}", ls)
                })
            }
            if (!messagei) {
                return interaction.reply({ embeds: [help_embed] });
            };

        } else if (command === 'join-role') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setjoinroles_not_admin });
            };

            let query = interaction.options.getString("value")
            var roleid = interaction.options.get("roles")
            let help_embed = new EmbedBuilder()
                .setColor("#016c9a")
                .setTitle(data.setjoinroles_help_embed_title)
                .setDescription(data.setjoinroles_help_embed_description)

            if (query === "true") {
                if (!roleid) return interaction.reply({ embeds: [help_embed] });
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                        .setDescription(data.setjoinroles_logs_embed_description_on_enable
                            .replace("${interaction.user.id}", interaction.user.id)
                        );

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };

                try {
                    let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles` });
                    if (already === roleid.value) return interaction.reply({ content: data.setjoinroles_already_on_enable })
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`, value: roleid.value });
                    return interaction.reply({
                        content: data.setjoinroles_command_work_enable
                            .replace("${roleid}", roleid.value)
                    });
                } catch (e) {
                    return interaction.reply({ content: data.setjoinroles_command_error_on_enable });
                }
            } else {
                if (query === "false") {
                    try {
                        let ban_embed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setjoinroles_logs_embed_title_on_disable)
                            .setDescription(data.setjoinroles_logs_embed_description_on_disable
                                .replace("${interaction.user.id}", interaction.user.id)
                            );
                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        logchannel.send({ embeds: [ban_embed] });
                    } catch (e) { }

                    try {
                        let already = await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles` });
                        if (!already) return interaction.reply({ content: data.setjoinroles_dont_need_command_on_disable })

                        return interaction.reply({ content: data.setjoinroles_command_work_on_disable });

                    } catch (e) {
                        return interaction.reply({ content: data.setjoinroles_command_error_on_disable });
                    }
                } else {
                    if (query === "ls") {
                        let roles = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles` })
                        if (!roles) return interaction.reply({ content: data.setjoinroles_command_any_set_ls })
                        return interaction.reply({
                            content: data.setjoinroles_command_work_ls
                                .replace("${roles}", roles)
                        });
                    } else {
                        interaction.reply({ embeds: [help_embed] });
                    }
                }
            };

        } else if (command === 'leave-message') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setleavemessage_not_admin });
            };

            let type = interaction.options.getString("value")
            let messagei = interaction.options.getString("message")

            let help_embed = new EmbedBuilder()
                .setColor("#016c9a")
                .setTitle(data.setleavemessage_help_embed_title)
                .setDescription(data.setleavemessage_help_embed_description)
                .addFields({
                    name: data.setleavemessage_help_embed_fields_name,
                    value: data.setleavemessage_help_embed_fields_value
                })

            if (type == "on") {
                if (messagei) {
                    let joinmsgreplace = messagei
                        .replace("{user}", "{user}")
                        .replace("{guild}", "{guild}")
                        .replace("{membercount}", "{membercount}")
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`, value: joinmsgreplace })

                    try {
                        const logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setleavemessage_logs_embed_title_on_enable)
                            .setDescription(data.setleavemessage_logs_embed_description_on_enable
                                .replace("${interaction.user.id}", interaction.user.id)
                            )

                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                    } catch (e: any) { logger.err(e) };

                    return interaction.reply({ content: data.setleavemessage_command_work_on_enable })
                }

            } else {
                if (type == "off") {
                    await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage` });
                    try {
                        let ban_embed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setleavemessage_logs_embed_title_on_disable)
                            .setDescription(data.setleavemessage_logs_embed_description_on_disable
                                .replace("${interaction.user.id}", interaction.user.id)
                            )
                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        logchannel.send({ embeds: [ban_embed] })
                    } catch (e: any) { logger.err(e) }
                    return interaction.reply({ content: data.setleavemessage_command_work_on_disable })
                }
            }
            if (type == "ls") {
                var ls = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage` });
                return interaction.reply({ content: data.setleavemessage_command_work_ls })
            }

            if (!messagei) {
                return interaction.reply({ embeds: [help_embed] })
            };

        } else if (command === 'setup') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setup_not_admin });
            };

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (!logchannel) {
                interaction.guild.channels.create({
                    name: 'ihorizon-logs',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        }
                    ],
                })
                return interaction.reply({ content: data.setup_command_work })
            } else { return interaction.reply({ content: data.setup_command_error }) }

        };
    },
};
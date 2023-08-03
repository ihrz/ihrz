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
    AttachmentBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms from 'ms';
import fs from 'fs';

export const command: Command = {
    name: "ranks",
    description: "Subcommand for ranks category!",
    options: [
        {
            name: "disable",
            description: "Disable the message when user earn new xp level message!",
            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'What you want to do?',
                    required: true,
                    choices: [
                        {
                            name: "Remove the module (don't send any message but user still earn xp level)",
                            value: "off"
                        },
                        {
                            name: 'Power on the module (send message when user earn xp level)',
                            value: "on"
                        },
                    ],
                },
            ],
        },
        {
            name: "show",
            description: "Get the user's xp level!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to lookup, keep blank if you want to show your stats',
                    required: false
                }
            ],
        },
        {
            name: "set-channel",
            description: "Set the channel where user earn new xp level message!",
            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'What you want to do?',
                    required: true,
                    choices: [
                        {
                            name: "Remove the module (send xp message on the user's message channel)",
                            value: "off"
                        },
                        {
                            name: 'Power on the module (send xp message on a specific channel)',
                            value: "on"
                        }
                    ],
                },
                {
                    name: 'channel',
                    type: ApplicationCommandOptionType.Channel,
                    description: 'The specific channel for xp message !',
                    required: false
                }
            ],
        },
        {
            name: "leaderboard",
            description: "Get the xp's leaderboard of the guild!",
            type: 1,
        },
    ],
    category: 'ranks',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'disable') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.disablexp_not_admin });
            };

            let types = interaction.options.get("action").value

            if (types == "off") {
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.disablexp_logs_embed_title_disable)
                        .setDescription(data.disablexp_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.user.id))

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, value: "off" });
                return interaction.reply({ content: data.disablexp_command_work_disable });
            } else {
                if (types == "on") {
                    try {
                        const logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.disablexp_logs_embed_title_enable)
                            .setDescription(data.disablexp_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.user.id))

                        let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                    } catch (e: any) { logger.err(e) };
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, value: "on" });
                    return interaction.reply({ content: data.disablexp_command_work_enable });
                }
            };

        } else if (command === 'show') {

            let user = interaction.options.getUser("user") || interaction.user;
            var level = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.id}.XP_LEVELING.level` }) || 0;
            var currentxp = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.id}.XP_LEVELING.xp` }) || 0;

            var xpNeeded = level * 500 + 500
            var expNeededForLevelUp = xpNeeded - currentxp
            let nivEmbed = new EmbedBuilder()
                .setTitle(data.level_embed_title
                    .replace('${user.username}', user.username)
                )
                .setColor('#0014a8')
                .addFields({
                    name: data.level_embed_fields1_name, value: data.level_embed_fields1_value
                        .replace('${currentxp}', currentxp)
                        .replace('${xpNeeded}', xpNeeded), inline: true
                },
                    {
                        name: data.level_embed_fields2_name, value: data.level_embed_fields2_value
                            .replace('${level}', level), inline: true
                    })
                .setDescription(data.level_embed_description
                    .replace('${expNeededForLevelUp}', expNeededForLevelUp)
                )
                .setTimestamp()
                .setThumbnail("https://cdn.discordapp.com/attachments/847484098070970388/850684283655946240/discord-icon-new-2021-logo-09772BF096-seeklogo.com.png")
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })

            return await interaction.reply({ embeds: [nivEmbed] });

        } else if (command === 'set-channel') {

            let type = interaction.options.getString("action");
            let argsid = interaction.options.getChannel("channel");

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setxpchannels_not_admin });
            }
            if (type === "on") {
                if (!argsid) return interaction.reply({ content: data.setxpchannels_valid_channel_message });

                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setxpchannels_logs_embed_title_enable)
                        .setDescription(data.setxpchannels_logs_embed_description_enable.replace(/\${interaction\.user.id}/g, interaction.user.id)
                            .replace(/\${argsid}/g, argsid.id))

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };
                try {
                    let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` })
                    if (already === argsid.id) return interaction.reply({ content: data.setxpchannels_already_with_this_config });

                    interaction.client.channels.cache.get(argsid.id)?.send({ content: data.setxpchannels_confirmation_message })
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`, value: argsid.id });

                    return interaction.reply({ content: data.setxpchannels_command_work_enable.replace(/\${argsid}/g, argsid.id) });

                } catch (e) {
                    interaction.reply({ content: data.setxpchannels_command_error_enable });
                }

            };

            if (type == "off") {
                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setxpchannels_logs_embed_title_disable)
                        .setDescription(data.setxpchannels_logs_embed_description_disable.replace(/\${interaction\.user.id}/g, interaction.user.id))

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };
                try {
                    let already2 = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` });

                    if (already2 === "off") return interaction.reply({ content: data.setxpchannels_already_disabled_disable });

                    await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` });
                    return interaction.reply({ content: data.setxpchannels_command_work_disable });
                } catch (e) {
                    return await interaction.reply({ content: data.setxpchannels_command_error_disable });
                }
            };

        } else if (command === 'leaderboard') {

            let sus = interaction.options.getMember("user");
            const ownerList = await db.DataBaseModel({ id: db.All });
            const foundArray = ownerList.findIndex((d: { id: any; }) => d.id === interaction.guild.id);
    
            await interaction.reply({ content: ":clock:" });
            if (!ownerList[foundArray]) return interaction.editReply({ content: 'Not data found in the storage.' });
            const char = ownerList[foundArray].value.USER;
            let tableau = [];
    
            for (const i in char) {
                const a = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${i}.XP_LEVELING` });
                if (a) {
                    let user = await interaction.client.users.cache.get(i);
                    if (user) {
                        tableau.push({
                            text: `👤 <@${user.id}> \`(${user.username})\`\n⭐ ➥ **Level**: \`${a.level || '0'}\`\n🔱 ➥ **XP Total**: \`${a.xptotal}\``, length: a.xptotal,
                            rawText: `👤 (${user.username})\n⭐ ➥ Level: ${a.level || '0'}\n🔱 ➥ XP Total: ${a.xptotal}`
                        });
                    };
                }
            };
    
            tableau.sort((a, b) => b.length - a.length);
    
            const embed = new EmbedBuilder().setColor("#1456b6").setTimestamp();
            let i = 1;
            let o = '';
    
            tableau.forEach(index => {
                if (i < 4) {
                    embed.addFields({ name: `Top #${i}`, value: index.text });
                };
                o += `Top #${i} ${index.rawText}\n`
                i++;
            });
    
            const writeFilePromise = (file: string, data: string) => {
                return new Promise((resolve, reject) => {
                    fs.writeFile(file, data, error => {
                        if (error) reject(error);
                        resolve("file created successfully with handcrafted Promise!");
                    });
                });
            };
    
            writeFilePromise(
                `${process.cwd()}/src/temp/${interaction.id}.txt`,
                o
            );
    
            const attachment = new AttachmentBuilder(`${process.cwd()}/src/temp/${interaction.id}.txt`, { name: 'leaderboard.txt' });
    
            embed.setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`);
            embed.setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });
            embed.setTitle(`${interaction.guild.name}'s Levels Leaderboard`)
            return await interaction.editReply({ embeds: [embed], content: ' ', files: [attachment] });
    
        };
    },
}
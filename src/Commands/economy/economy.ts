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
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms from 'ms';

export const command: Command = {
    name: "economy",
    description: "Subcommand for economy category!",
    options: [
        {
            name: "manage",
            description: "Remove / Add money to a user!",
            type: 2,
            options: [
                {
                    name: 'add',
                    description: 'Add money to a user!',
                    type: 1,
                    options: [
                        {
                            name: 'amount',
                            type: ApplicationCommandOptionType.Number,
                            description: 'The amount of money you want to add',
                            required: true
                        },
                        {
                            name: 'member',
                            type: ApplicationCommandOptionType.User,
                            description: 'The member who you want to add money',
                            required: true
                        }
                    ],
                },
                {
                    name: 'remove',
                    description: 'Remove money from a user!',
                    type: 1,
                    options: [
                        {
                            name: 'amount',
                            type: ApplicationCommandOptionType.Number,
                            description: 'amount of $ you want add',
                            required: true
                        },
                        {
                            name: 'member',
                            type: ApplicationCommandOptionType.User,
                            description: 'the member you want to add the money',
                            required: true
                        }
                    ],
                },
            ],
        },
        {
            name: 'wallet',
            description: 'Get the balance of a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'Target a user for see their current balance or keep blank for yourself',
                    required: false
                }
            ],
        },
        {
            name: 'reward',
            description: 'Claim a reward!',
            type: 2,
            options: [
                {
                    name: 'daily',
                    description: 'Claim a daily reward!',
                    type: 1
                },
                {
                    name: 'monthly',
                    description: 'Claim a monthly reward!',
                    type: 1
                },
                {
                    name: 'weekly',
                    description: 'Claim a weekly reward!',
                    type: 1
                }
            ],
        },
        {
            name: 'pay',
            description: 'Pay a user a certain amount!',
            type: 1,
            options: [
                {
                    name: 'amount',
                    type: ApplicationCommandOptionType.Number,
                    description: 'The amount of money you want to donate to them',
                    required: true
                },
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'The member you want to donate the money',
                    required: true
                }
            ],
        },
        {
            name: 'rob',
            description: 'Rob a user!',
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to rob a money',
                    required: true
                }
            ],
        },
        {
            name: 'work',
            description: 'Claim a work reward!',
            type: 1
        },
    ],
    category: 'economy',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'add') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.addmoney_not_admin })
            };

            let amount = interaction.options.get("amount");
            let user = interaction.options.get("member");

            await interaction.reply({
                content: data.addmoney_command_work
                    .replace("${user.user.id}", user.user.id)
                    .replace("${amount.value}", amount.value)
            });

            await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, value: amount.value });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.addmoney_logs_embed_title)
                    .setDescription(data.addmoney_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${amount\.value}/g, amount.value)
                        .replace(/\${user\.user\.id}/g, user.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { return };

        } else if (command === 'wallet') {

            let member = interaction.options.get('user');

            if (!member) {
                var bal = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money` });

                if (!bal) {
                    return await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: 1 }),
                        interaction.reply({ content: data.balance_dont_have_wallet });
                }
                interaction.reply({
                    content: data.balance_have_wallet
                        .replace(/\${bal}/g, bal)
                });
            } else {
                if (member) {
                    var bal = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.value}.ECONOMY.money` });

                    if (!bal) {
                        return await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.USER.${member.value}.ECONOMY.money`, value: 1 }),
                            interaction.reply({
                                content: data.balance_he_dont_have_wallet
                            });
                    };
                    return await interaction.reply({
                        content: data.balance_he_have_wallet.replace(/\${bal}/g, bal)
                    });
                }
            };

        } else if (command === 'daily') {

            let timeout = 86400000;
            let amount = 500;
            let daily = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.daily` });

            if (daily !== null && timeout - (Date.now() - daily) > 0) {
                let time = ms(timeout - (Date.now() - daily));

                return await interaction.reply({ content: data.daily_cooldown_error.replace(/\${time}/g, time) });
            } else {
                let embed = new EmbedBuilder()
                    .setAuthor({ name: data.daily_embed_title, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
                    .setColor("#a4cb80")
                    .setDescription(data.daily_embed_description)
                    .addFields({ name: data.daily_embed_fields, value: `${amount}🪙` })

                await interaction.reply({ embeds: [embed] });
                await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: amount });
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.daily`, value: Date.now() });
            };

        } else if (command === 'monthly') {

            let timeout = 2592000000;
            let amount = 5000;

            let monthly = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.monthly` });

            if (monthly !== null && timeout - (Date.now() - monthly) > 0) {
                let time = ms(timeout - (Date.now() - monthly));

                return await interaction.reply({ content: data.monthly_cooldown_error.replace(/\${time}/g, time) });
            } else {
                let embed = new EmbedBuilder()
                    .setAuthor({ name: data.monthly_embed_title, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
                    .setColor("#a4cb80")
                    .setDescription(data.monthly_embed_description)
                    .addFields({ name: data.monthly_embed_fields, value: `${amount}🪙` })
                await interaction.reply({ embeds: [embed] });
                await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: amount });
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.monthly`, value: Date.now() });
            };

        } else if (command === 'pay') {

            let user = interaction.options.getMember("member");
            let amount = interaction.options.getNumber("amount");

            let member = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.id}.ECONOMY.money` });
            if (amount.toString().includes('-')) {
                return interaction.reply({ content: data.pay_negative_number_error });
            }
            if (member < amount.value) {
                return interaction.reply({ content: data.pay_dont_have_enought_to_give })
            }

            await interaction.reply({
                content: data.pay_command_work
                    .replace(/\${interaction\.user\.username}/g, interaction.user.username)
                    .replace(/\${user\.user\.username}/g, user.user.username)
                    .replace(/\${amount}/g, amount)
            })
            await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${user.id}.ECONOMY.money`, value: amount });
            await db.DataBaseModel({ id: db.Sub, key: `${interaction.guild.id}.USER.${interaction.member.id}.ECONOMY.money`, value: amount });

        } else if (command === 'remove') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.removemoney_not_admin })
            };

            var amount = interaction.options.getNumber("amount");
            let user = interaction.options.get("member");

            await db.DataBaseModel({ id: db.Sub, key: `${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, value: amount });
            let bal = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money` });

            let embed = new EmbedBuilder()
                .setAuthor({ name: data.removemoney_embed_title, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
                .addFields({ name: data.removemoney_embed_fields, value: `${amount}$` },
                    { name: data.removemoney_embed_second_fields, value: `${bal}$` })
                .setColor("#bc0116")
                .setTimestamp()

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.removemoney_logs_embed_title)
                    .setDescription(data.removemoney_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${amount}/g, amount)
                        .replace(/\${user\.user\.id}/g, user.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
            } catch (e) { return; };

            return interaction.reply({ embeds: [embed] });

        } else if (command === 'rob') {

            let talkedRecentlyforr = new Set();

            if (talkedRecentlyforr.has(interaction.user.id)) {
                return interaction.reply({ content: data.rob_cooldown_error });
            }

            let user = interaction.options.getMember("member");
            let targetuser = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.id}.ECONOMY.money` });
            let author = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money` })
            if (author < 250) {
                return interaction.reply({ content: data.rob_dont_enought_error })
            }

            if (targetuser < 250) {
                return interaction.reply({
                    content: data.rob_him_dont_enought_error
                        .replace(/\${user\.user\.username}/g, user.user.username)
                })
            }
            let random = Math.floor(Math.random() * 200) + 1;

            let embed = new EmbedBuilder()
                .setDescription(data.rob_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace(/\${user\.id}/g, user.id)
                    .replace(/\${random}/g, random)
                )
                .setColor("#a4cb80")
                .setTimestamp()

            await interaction.reply({ embeds: [embed] });

            await db.DataBaseModel({ id: db.Sub, key: `${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, value: random });
            await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: random });

            talkedRecentlyforr.add(interaction.user.id);
            setTimeout(() => {
                talkedRecentlyforr.delete(interaction.user.id);
            }, 3000000);

        } else if (command === 'weekly') {

            let timeout = 604800000;
            let amount = 1000;
            let weekly = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.weekly` });

            if (weekly !== null && timeout - (Date.now() - weekly) > 0) {
                let time = ms(timeout - (Date.now() - weekly));

                interaction.reply({
                    content: data.weekly_cooldown_error
                        .replace(/\${time}/g, time)
                })
            } else {
                let embed = new EmbedBuilder()
                    .setAuthor({ name: data.weekly_embed_title, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
                    .setColor("#a4cb80")
                    .setDescription(data.weekly_embed_description)
                    .addFields({ name: data.weekly_embed_fields, value: `${amount}🪙` })


                await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: amount }),
                    await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.weekly`, value: Date.now() });

                return interaction.reply({ embeds: [embed] });
            };

        } else if (command === 'work') {

            let talkedRecentlyforw = new Set();

            if (talkedRecentlyforw.has(interaction.user.id)) {
                return interaction.reply({ content: data.work_cooldown_error });
            };

            let amount = Math.floor(Math.random() * 200) + 1;

            let embed = new EmbedBuilder()
                .setAuthor({
                    name: data.work_embed_author
                        .replace(/\${interaction\.user\.username}/g, interaction.user.username)

                    , iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`
                })
                .setDescription(data.work_embed_description
                    .replace(/\${interaction\.user\.username}/g, interaction.user.username)
                    .replace(/\${amount}/g, amount)
                )
                .setColor("#f1d488");

            await interaction.reply({ embeds: [embed] });
            await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: amount });

            talkedRecentlyforw.add(interaction.user.id);
            setTimeout(() => {
                talkedRecentlyforw.delete(interaction.user.id);
            }, 3600000);

        };
    },
}
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
    ActionRowBuilder,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    PermissionsBitField,
    TextChannel,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setchannels_not_admin });
            return;
        };

        var current_join_channel = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`);
        if (current_join_channel) {
            current_join_channel = `<#${current_join_channel}>`
        } else {
            current_join_channel = client.iHorizon_Emojis.icon.No_Logo
        };

        var current_leave_channel = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`);
        if (current_leave_channel) {
            current_leave_channel = `<#${current_leave_channel}>`
        } else {
            current_leave_channel = client.iHorizon_Emojis.icon.No_Logo
        };

        let embed = new EmbedBuilder()
            .setColor('#6e819a')
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setTitle(data.setchannels_title_embed_panel)
            .setThumbnail((interaction.guild?.iconURL() as string))
            .setTimestamp()
            .addFields(
                { name: data.setchannels_embed_fields_value_join, value: current_join_channel, inline: true },
                { name: data.setchannels_embed_fields_value_leave, value: current_leave_channel, inline: true }
            );

        let action_row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guildconfig-channel-panel-change-join-channel')
                    .setLabel(data.setchannels_button_join)
                    .setStyle(ButtonStyle.Primary)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guildconfig-channel-panel-change-leave-channel')
                    .setLabel(data.setchannels_button_leave)
                    .setStyle(ButtonStyle.Primary)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guildconfig-channel-panel-erase-data')
                    .setLabel(data.setchannels_button_delete)
                    .setStyle(ButtonStyle.Danger)
            );

        let response = await interaction.editReply({
            embeds: [embed],
            components: [action_row],
            files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
        });

        let collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 50_000
        });

        collector.on('collect', async (i) => {

            if (i.customId === 'guildconfig-channel-panel-change-join-channel') {

                let i2 = await i.reply({
                    content: data.setchannels_which_channel.replace('${interaction.user.id}', interaction.user.id)
                });
                let i2Collector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.user.id, max: 1, time: 20_000 });

                i2Collector?.on('collect', async (msg) => {
                    const channelId = msg.content.match(/\d+/)?.[0];

                    var channel = interaction.guild?.channels.cache.get(channelId as string) as TextChannel;
                    current_join_channel = `<#${channelId}>`;

                    if (!(channel instanceof TextChannel)) {
                        i2.delete();
                        msg.reply(data.setchannels_not_a_text_channel
                            .replace('${client.iHorizon_Emojis.icon.Warning_Icon}', client.iHorizon_Emojis.icon.Warning_Icon)
                        );
                    } else {
                        try {
                            let logEmbed = new EmbedBuilder()
                                .setColor("#bf0bb9")
                                .setTitle(data.setchannels_logs_embed_title_on_join)
                                .setDescription(data.setchannels_logs_embed_description_on_join
                                    .replace(/\${argsid\.id}/g, channelId as string)
                                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                                )

                            let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                            if (logchannel) {
                                (logchannel as BaseGuildTextChannel)?.send({ embeds: [logEmbed] })
                            }
                        } catch (e: any) {
                            logger.err(e)
                        };

                        try {
                            let already = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`);

                            if (already === channelId) {
                                await msg.reply({ content: data.setchannels_already_this_channel_on_join });
                                return;
                            };

                            (interaction.client.channels.cache.get(channelId as string) as BaseGuildTextChannel).send({ content: data.setchannels_confirmation_message_on_join });
                            await client.db.set(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`, channelId);

                            i2.delete();
                            await msg.reply({
                                content: data.setchannels_command_work_on_join
                                    .replace(/\${argsid\.id}/g, channelId as string)
                            });

                            embed.setFields(
                                { name: data.setchannels_embed_fields_value_join, value: current_join_channel, inline: true },
                                { name: data.setchannels_embed_fields_value_leave, value: current_leave_channel, inline: true }
                            );
                            response.edit({ embeds: [embed] });
                            return;
                        } catch (e) {
                            msg.reply({ content: data.setchannels_command_error_on_join });
                        };

                    }

                });


            } else if (i.customId === 'guildconfig-channel-panel-change-leave-channel') {

                let i2 = await i.reply({
                    content: data.setchannels_which_channel.replace('${interaction.user.id}', interaction.user.id)
                });
                let i2Collector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.user.id, max: 1, time: 20_000 });

                i2Collector?.on('collect', async (msg) => {
                    const channelId = msg.content.match(/\d+/)?.[0];

                    var channel = interaction.guild?.channels.cache.get(channelId as string) as TextChannel;
                    current_leave_channel = `<#${channelId}>`;

                    if (!(channel instanceof TextChannel)) {
                        i2.delete();
                        msg.reply(data.setchannels_not_a_text_channel
                            .replace('${client.iHorizon_Emojis.icon.Warning_Icon}', client.iHorizon_Emojis.icon.Warning_Icon)
                        );
                        return;
                    }

                    try {
                        let logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setchannels_logs_embed_title_on_leave)
                            .setDescription(data.setchannels_logs_embed_description_on_leave
                                .replace(/\${argsid\.id}/g, channelId as string)
                                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            );

                        let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) {
                            (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                        }
                    } catch (e: any) {
                        logger.err(e)
                    };

                    try {
                        let already = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`);

                        if (already === channelId as string) {
                            await msg.reply({ content: data.setchannels_already_this_channel_on_leave });
                            return;
                        };

                        (interaction.client.channels.cache.get(channelId as string) as BaseGuildTextChannel).send({ content: data.setchannels_confirmation_message_on_leave });
                        await client.db.set(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`, channelId as string);

                        i2.delete();
                        await msg.reply({
                            content: data.setchannels_command_work_on_leave
                                .replace(/\${argsid\.id}/g, channelId as string)
                        });

                        embed.setFields(
                            { name: data.setchannels_embed_fields_value_join, value: current_join_channel, inline: true },
                            { name: data.setchannels_embed_fields_value_leave, value: current_leave_channel, inline: true }
                        );
                        response.edit({ embeds: [embed] });
                    } catch (e) {
                        await msg.reply({ content: data.setchannels_command_error_on_leave });
                        return;
                    };

                });


            } else if (i.customId === 'guildconfig-channel-panel-erase-data') {

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setchannels_logs_embed_title_on_off)
                        .setDescription(data.setchannels_logs_embed_description_on_off
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )

                    let logchannel = interaction.guild?.channels.cache.find((channel) => channel.name === 'ihorizon-logs');

                    if (logchannel) {
                        (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                    };
                } catch (e: any) {
                    logger.err(e)
                };

                let leavec = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`);
                let joinc = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`);

                if (!joinc && !leavec) {
                    await i.reply({ content: data.setchannels_already_on_off });
                } else {
                    await client.db.delete(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`);
                    await client.db.delete(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`);
                    await i.reply({ content: data.setchannels_command_work_on_off });

                    current_join_channel = client.iHorizon_Emojis.icon.No_Logo
                    current_leave_channel = client.iHorizon_Emojis.icon.No_Logo

                    embed.setFields(
                        { name: data.setchannels_embed_fields_value_join, value: current_join_channel, inline: true },
                        { name: data.setchannels_embed_fields_value_leave, value: current_leave_channel, inline: true }
                    );
                    response.edit({ embeds: [embed] });
                }
            };
        })

    },
};
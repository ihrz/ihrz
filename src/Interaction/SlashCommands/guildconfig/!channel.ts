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

import {
    ActionRowBuilder,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    PermissionsBitField,
    TextChannel,
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';
import { DatabaseStructure } from '../../../core/database_structure';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setchannels_not_admin });
            return;
        };

        var baseData = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG`) as DatabaseStructure.DbGuildObject['GUILD_CONFIG'];
        var current_join_channel = '';
        var current_leave_channel = '';

        if (baseData?.join) {
            current_join_channel = `<#${baseData.join}>`
        } else {
            current_join_channel = client.iHorizon_Emojis.icon.No_Logo
        };

        if (baseData?.leave) {
            current_leave_channel = `<#${baseData.leave}>`
        } else {
            current_leave_channel = client.iHorizon_Emojis.icon.No_Logo
        };

        let embed = new EmbedBuilder()
            .setColor('#6e819a')
            .setFooter({ text: await client.func.displayBotName(interaction.guild.id), iconURL: "attachment://icon.png" })
            .setTitle(data.setchannels_title_embed_panel)
            .setThumbnail((interaction.guild.iconURL() as string))
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
            files: [{ attachment: await interaction.client.func.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
        });

        let collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 50_000
        });

        collector.on('collect', async (i) => {

            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: data.help_not_for_you, ephemeral: true });
                return;
            };

            if (i.customId === 'guildconfig-channel-panel-change-join-channel') {
                const channelSelectMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('guildconfig-channel-selectMenu-join-channel')
                            .setChannelTypes(ChannelType.GuildText)
                            .addDefaultChannels(baseData?.join || interaction.channel?.id!)
                            .setMaxValues(1)
                            .setMinValues(1)
                    )
                    ;
                let i2 = await i.reply({
                    content: data.setchannels_which_channel.replace('${interaction.user.id}', interaction.user.id),
                    components: [channelSelectMenu]
                });

                let i2Collector = interaction.channel?.createMessageComponentCollector({
                    filter: (x) => x.user.id === interaction.user.id && x.customId === 'guildconfig-channel-selectMenu-join-channel',
                    componentType: ComponentType.ChannelSelect,
                    time: 30_000,
                })

                i2Collector?.on('collect', async (result) => {
                    const channelId = result.channels.first()?.id

                    var channel = interaction.guild?.channels.cache.get(channelId as string) as TextChannel;
                    current_join_channel = `<#${channelId}>`;

                    if (!(channel instanceof TextChannel)) {
                        i2.delete();
                        result.reply(data.setchannels_not_a_text_channel
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
                                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                            }
                        } catch (e: any) {
                            logger.err(e)
                        };

                        try {
                            let already = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.join`);

                            if (already === channelId) {
                                await result.reply({ content: data.setchannels_already_this_channel_on_join });
                                return;
                            };

                            (interaction.client.channels.cache.get(channelId as string) as BaseGuildTextChannel).send({ content: data.setchannels_confirmation_message_on_join });
                            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.join`, channelId);

                            i2.delete();
                            i2Collector.stop();
                            await result.reply({
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
                            result.reply({ content: data.setchannels_command_error_on_join });
                        };

                    }

                });

                i2Collector?.on('end', async () => {
                    await i2.delete().catch(() => { });
                })

            } else if (i.customId === 'guildconfig-channel-panel-change-leave-channel') {
                const channelSelectMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('guildconfig-channel-selectMenu-leave-channel')
                            .setChannelTypes(ChannelType.GuildText)
                            .addDefaultChannels(baseData?.leave || interaction.channel?.id!)
                            .setMaxValues(1)
                            .setMinValues(1)
                    )
                    ;
                let i2 = await i.reply({
                    content: data.setchannels_which_channel.replace('${interaction.user.id}', interaction.user.id),
                    components: [channelSelectMenu]
                });

                let i2Collector = interaction.channel?.createMessageComponentCollector({
                    filter: (x) => x.user.id === interaction.user.id && x.customId === 'guildconfig-channel-selectMenu-leave-channel',
                    componentType: ComponentType.ChannelSelect,
                    time: 30_000,
                })

                i2Collector?.on('collect', async (result) => {
                    const channelId = result.channels.first()?.id

                    var channel = interaction.guild?.channels.cache.get(channelId as string) as TextChannel;
                    current_leave_channel = `<#${channelId}>`;

                    if (!(channel instanceof TextChannel)) {
                        i2.delete();
                        result.reply(data.setchannels_not_a_text_channel
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
                        let already = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.leave`);

                        if (already === channelId as string) {
                            await result.reply({ content: data.setchannels_already_this_channel_on_leave });
                            return;
                        };

                        (interaction.client.channels.cache.get(channelId as string) as BaseGuildTextChannel).send({ content: data.setchannels_confirmation_message_on_leave });
                        await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.leave`, channelId as string);

                        i2.delete();
                        i2Collector.stop();
                        await result.reply({
                            content: data.setchannels_command_work_on_leave
                                .replace(/\${argsid\.id}/g, channelId as string)
                        });

                        embed.setFields(
                            { name: data.setchannels_embed_fields_value_join, value: current_join_channel, inline: true },
                            { name: data.setchannels_embed_fields_value_leave, value: current_leave_channel, inline: true }
                        );
                        response.edit({ embeds: [embed] });
                    } catch (e) {
                        await result.reply({ content: data.setchannels_command_error_on_leave });
                        return;
                    };

                });

                i2Collector?.on('end', async () => {
                    await i2.delete().catch(() => { });
                })

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

                let leavec = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.join`);
                let joinc = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.leave`);

                if (!joinc && !leavec) {
                    await i.reply({ content: data.setchannels_already_on_off });
                } else {
                    await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.join`);
                    await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.leave`);
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
        });

        collector.on('end', async () => {
            action_row.components.forEach(x => {
                x.setDisabled(true)
            });

            response.edit({ components: [action_row] });
        })
    },
};
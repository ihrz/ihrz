/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

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
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setleavemessage_not_admin });
            return;
        };

        let leaveMessage = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`);

        let help_embed = new EmbedBuilder()
            .setColor("#ffb3cc")
            .setDescription(data.setjoinmessage_help_embed_desc)
            .setTitle(data.setleavemessage_help_embed_title)
            .setFields(
                {
                    name: data.setjoinmessage_help_embed_fields_custom_name,
                    value: leaveMessage ? `\`\`\`${leaveMessage}\`\`\`\n${leaveMessage
                        .replaceAll("{memberUsername}", interaction.user.username)
                        .replaceAll("{memberMention}", interaction.user.toString())
                        .replaceAll('{memberCount}', interaction.guild?.memberCount.toString()!)
                        .replaceAll('{createdAt}', interaction.user.createdAt.toDateString())
                        .replaceAll('{guildName}', interaction.guild?.name!)
                        .replaceAll('{inviterUsername}', interaction.client.user?.username)
                        .replaceAll('{inviterMention}', interaction.client.user.toString())
                        .replaceAll('{invitesCount}', '1337')
                        }` : data.setjoinmessage_help_embed_fields_custom_name_empy
                },
                {
                    name: data.setjoinmessage_help_embed_fields_default_name_empy,
                    value: `\`\`\`${data.event_goodbye_inviter}\`\`\`\n${data.event_goodbye_inviter
                        .replace("{memberMention}", interaction.user.toString())
                        .replace('{createdAt}', interaction.user.createdAt.toDateString())
                        .replace('{inviterUsername}', interaction.client.user?.username)
                        .replace('{invitesCount}', '1337')
                        .replace('{memberCount}', interaction.guild?.memberCount.toString()!)
                        .replace('{guildName}', interaction.guild?.name!)
                        }`
                }
            );
        let embedFields = help_embed.data?.fields ?? [];

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("leaveMessage-set-message")
                    .setLabel('Set message')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("leaveMessage-default-message")
                    .setLabel('Default Message')
                    .setStyle(ButtonStyle.Danger),
            );

        let originalResponse = await interaction.editReply({
            embeds: [help_embed],
            components: [buttons]
        });

        let collector = originalResponse.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (u) => u.user.id === interaction.user.id,
            time: 80_000
        });

        collector.on('collect', async collectInteraction => {
            if (collectInteraction.customId === "leaveMessage-set-message") {
                await collectInteraction.reply({
                    content: data.setleavemessage_awaiting_response,
                    ephemeral: true
                });

                let questionReply = interaction.channel?.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 120_000
                });

                questionReply?.on('collect', async collected => {
                    let response = collected.content;
                    let newEmbed = EmbedBuilder.from(help_embed).setFields(
                        {
                            name: data.setjoinmessage_help_embed_fields_custom_name,
                            value: response ? `\`\`\`${response}\`\`\`\n${response
                                .replaceAll("{memberUsername}", interaction.user.username)
                                .replaceAll("{memberMention}", interaction.user.toString())
                                .replaceAll('{memberCount}', interaction.guild?.memberCount.toString()!)
                                .replaceAll('{createdAt}', interaction.user.createdAt.toDateString())
                                .replaceAll('{guildName}', interaction.guild?.name!)
                                .replaceAll('{inviterUsername}', interaction.client.user?.username)
                                .replaceAll('{inviterMention}', interaction.client.user.toString())
                                .replaceAll('{invitesCount}', '1337')
                                .replaceAll("\\n", '\n')
                                }` : data.setjoinmessage_help_embed_fields_custom_name_empy
                        },
                    );

                    await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`, response);

                    collected.delete();
                    newEmbed.addFields(embedFields[1]);
                    originalResponse.edit({ embeds: [newEmbed] });
                    questionReply.stop();

                    await interaction.editReply({
                        content: data.setleavemessage_command_work_on_enable
                            .replace(
                                "${client.iHorizon_Emojis.icon.Yes_Logo}",
                                client.iHorizon_Emojis.icon.Green_Tick_Logo
                            )
                    });

                    try {
                        let logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setleavemessage_logs_embed_title_on_enable)
                            .setDescription(data.setleavemessage_logs_embed_description_on_enable
                                .replace("${interaction.user.id}", interaction.user.id)
                            );

                        let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                        if (logchannel) {
                            (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                        };
                    } catch (e: any) {
                        logger.err(e);
                    };

                });
            } else if (collectInteraction.customId === "leaveMessage-default-message") {
                let newEmbed = EmbedBuilder.from(help_embed).setFields(
                    {
                        name: data.setjoinmessage_help_embed_fields_custom_name,
                        value: data.setjoinmessage_help_embed_fields_custom_name_empy
                    },
                );

                collectInteraction.deferUpdate();
                newEmbed.addFields(embedFields[1]);
                originalResponse.edit({ embeds: [newEmbed] });

                await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`);

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setleavemessage_logs_embed_title_on_disable)
                        .setDescription(data.setleavemessage_logs_embed_description_on_disable
                            .replace("${interaction.user.id}", interaction.user.id)
                        );

                    let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                    if (logchannel) {
                        (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                    };
                } catch (e: any) {
                    logger.err(e)
                };

                await interaction.editReply({
                    content: data.setleavemessage_command_work_on_disable.replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                });
            }
        })
    },
};
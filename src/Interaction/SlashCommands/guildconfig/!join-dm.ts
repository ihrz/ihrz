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

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setjoindm_not_admin });
            return;
        };

        let joinDm = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.joindm`) as string | undefined;
        joinDm = joinDm?.substring(0, 1010);

        let help_embed = new EmbedBuilder()
            .setColor("#0014a8")
            .setTitle(data.setjoindm_help_embed_title)
            .setDescription(data.setjoindm_help_embed_desc)
            .setFields(
                {
                    name: data.setjoinmessage_help_embed_fields_custom_name,
                    value: joinDm ? `\`\`\`${joinDm
                        .replaceAll("{memberUsername}", interaction.user.username)
                        .replaceAll("{memberMention}", interaction.user.toString())
                        .replaceAll('{memberCount}', interaction.guild?.memberCount.toString()!)
                        .replaceAll('{createdAt}', interaction.user.createdAt.toDateString())
                        .replaceAll('{guildName}', interaction.guild?.name!)
                        }\`\`\`\n` : data.setjoinmessage_help_embed_fields_custom_name_empy
                }
            );

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("joinMessage-set-message")
                    .setLabel(data.setjoindm_buttom_set_name)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("joinMessage-default-message")
                    .setLabel(data.setjoindm_buttom_delete_name)
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
            if (collectInteraction.customId === "joinMessage-set-message") {
                await collectInteraction.reply({
                    content: data.setjoindm_awaiting_response,
                    ephemeral: true
                });

                let questionReply = interaction.channel?.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 120_000
                });

                questionReply?.on('collect', async collected => {
                    let response = collected.content.substring(0, 1010);

                    try {
                        let logEmbed = new EmbedBuilder()
                            .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`) || "#bf0bb9")
                            .setTitle(data.setjoindm_logs_embed_title_on_enable)
                            .setDescription(data.setjoindm_logs_embed_description_on_enable
                                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            );

                        let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                        if (logchannel) {
                            (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                        };
                    } catch (e: any) {
                        logger.err(e)
                    };

                    await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joindm`, response);

                    await interaction.editReply({
                        embeds: [],
                        content: data.setjoindm_confirmation_message_on_enable
                            .replace(/\${dm_msg}/g, response),
                        components: []
                    });

                    collected.delete();
                    questionReply.stop();
                });
            } else if (collectInteraction.customId === "joinMessage-default-message") {
                await collectInteraction.deferUpdate();

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setjoindm_logs_embed_title_on_disable)
                        .setDescription(data.setjoindm_logs_embed_description_on_disable
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )
                    let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                } catch { };

                let already_off = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.joindm`);

                if (!already_off) {
                    await interaction.editReply({
                        content: data.setjoindm_already_disable,
                        embeds: [],
                        components: []
                    });
                } else {
                    await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.joindm`);
                    await interaction.editReply({
                        content: data.setjoindm_confirmation_message_on_disable,
                        embeds: [],
                        components: []
                    });
                };
            }
        });
    },
};
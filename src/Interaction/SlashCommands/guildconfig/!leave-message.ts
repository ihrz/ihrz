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
    TextInputStyle
} from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setleavemessage_not_admin });
            return;
        };

        let leaveMessage = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`);
        leaveMessage = leaveMessage?.substring(0, 1010);

        const helpEmbed = new EmbedBuilder()
            .setColor("#ffb3cc")
            .setDescription(data.setjoinmessage_help_embed_desc)
            .setTitle(data.setleavemessage_help_embed_title)
            .addFields(
                {
                    name: data.setjoinmessage_help_embed_fields_custom_name,
                    value: leaveMessage ? `\`\`\`${leaveMessage}\`\`\`\n${generateLeaveMessagePreview(leaveMessage, interaction)}` : data.setjoinmessage_help_embed_fields_custom_name_empy
                },
                {
                    name: data.setjoinmessage_help_embed_fields_default_name_empy,
                    value: `\`\`\`${data.event_goodbye_inviter}\`\`\`\n${generateLeaveMessagePreview(data.event_goodbye_inviter, interaction)}`
                }
            );

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("leaveMessage-set-message")
                    .setLabel(data.setjoinmessage_button_set_name)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("leaveMessage-default-message")
                    .setLabel(data.setjoinmessage_buttom_del_name)
                    .setStyle(ButtonStyle.Danger),
            );

        const originalResponse = await interaction.editReply({
            embeds: [helpEmbed],
            components: [buttons]
        });

        const collector = originalResponse.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (u) => u.user.id === interaction.user.id,
            time: 80_000
        });

        collector.on('collect', async (buttonInteraction) => {

            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({ content: data.help_not_for_you, ephemeral: true });
                return;
            };

            if (buttonInteraction.customId === "leaveMessage-set-message") {
                let modalInteraction = (await iHorizonModalResolve({
                    customId: 'leaveMessage-modal',
                    title: data.setleavemessage_awaiting_response,
                    deferUpdate: false,
                    fields: [
                        {
                            customId: 'leaveMessage-input',
                            label: data.guildprofil_embed_fields_leavemessage,
                            style: TextInputStyle.Paragraph,
                            required: true,
                            maxLength: 1010,
                        },
                    ]
                }, buttonInteraction))!;

                if (!modalInteraction) {
                    return;
                }

                const response = modalInteraction.fields.getTextInputValue('leaveMessage-input');
                const newEmbed = EmbedBuilder.from(helpEmbed).setFields(
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
                await modalInteraction.reply({
                    content: data.setleavemessage_command_work_on_enable
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo),
                    ephemeral: true
                });
                newEmbed.addFields(helpEmbed.data.fields![1]);
                await originalResponse.edit({ embeds: [newEmbed] });

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
            } else if (buttonInteraction.customId === "leaveMessage-default-message") {
                let newEmbed = EmbedBuilder.from(helpEmbed).setFields(
                    {
                        name: data.setjoinmessage_help_embed_fields_custom_name,
                        value: data.setjoinmessage_help_embed_fields_custom_name_empy
                    },
                );

                await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`);

                await buttonInteraction.reply({
                    content: data.setleavemessage_command_work_on_enable
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo),
                    ephemeral: true
                });

                newEmbed.addFields(helpEmbed.data.fields![1]);
                await originalResponse.edit({ embeds: [newEmbed] });

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
            }
        });

        collector.on('end', async () => {
            buttons.components.forEach(x => {
                x.setDisabled(true)
            })
            await originalResponse.edit({ components: [buttons] });
        });
    },
};


function generateLeaveMessagePreview(message: string, interaction: ChatInputCommandInteraction): string {
    return message
        .replaceAll("{memberUsername}", interaction.user.username)
        .replaceAll("{memberMention}", interaction.user.toString())
        .replaceAll('{memberCount}', interaction.guild?.memberCount?.toString()!)
        .replaceAll('{createdAt}', interaction.user.createdAt.toDateString())
        .replaceAll('{guildName}', interaction.guild?.name!)
        .replaceAll('{inviterUsername}', interaction.client.user?.username)
        .replaceAll('{inviterMention}', interaction.client.user?.toString())
        .replaceAll('{invitesCount}', '1337')
        .replaceAll("\\n", '\n');
}
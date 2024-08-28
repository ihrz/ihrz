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
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    PermissionsBitField,
    TextInputStyle
} from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await client.method.interactionSend(interaction, { content: data.ranksSetMessage_not_admin, ephemeral: true });
            return;
        }

        let xpMessage = await client.db.get(`${interaction.guildId}.GUILD.XP_LEVELING.message`);
        let guildLocal = await client.db.get(`${interaction.guild.id}.GUILD.LANG.lang`) || "en-US";

        xpMessage = xpMessage?.substring(0, 1010);

        const helpEmbed = new EmbedBuilder()
            .setColor("#ffb3cc")
            .setDescription(data.ranksSetMessage_help_embed_desc)
            .setTitle(data.ranksSetMessage_help_embed_title)
            .addFields(
                {
                    name: data.ranksSetMessage_help_embed_fields_custom_name,
                    value: xpMessage ? `\`\`\`${xpMessage}\`\`\`\n${client.method.generateCustomMessagePreview(xpMessage,
                        {
                            user: interaction.user,
                            guild: interaction.guild!,
                            guildLocal: guildLocal,
                            ranks: {
                                level: "4"
                            }
                        },
                    )}` : data.ranksSetMessage_help_embed_fields_custom_name_empy
                },
                {
                    name: data.ranksSetMessage_help_embed_fields_default_name_empy,
                    value: `\`\`\`${data.event_xp_level_earn}\`\`\`\n${client.method.generateCustomMessagePreview(data.event_xp_level_earn,
                        {
                            user: interaction.user,
                            guild: interaction.guild!,
                            guildLocal: guildLocal,
                            ranks: {
                                level: "4"
                            }
                        },
                    )}`
                }
            );

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("xpMessage-set-message")
                    .setLabel(data.ranksSetMessage_button_set_name)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("xpMessage-default-message")
                    .setLabel(data.ranksSetMessage_buttom_del_name)
                    .setStyle(ButtonStyle.Danger),
            );

        const message = await client.method.interactionSend(interaction, {
            embeds: [helpEmbed],
            components: [buttons]
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 80_000
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({ content: data.help_not_for_you, ephemeral: true });
                return;
            };

            if (buttonInteraction.customId === "xpMessage-set-message") {
                let modalInteraction = await iHorizonModalResolve({
                    customId: 'xpMessage-modal',
                    title: data.ranksSetMessage_awaiting_response,
                    deferUpdate: false,
                    fields: [
                        {
                            customId: 'xpMessage-input',
                            label: data.ranksSetMessage_embed_fields_xpmessage,
                            style: TextInputStyle.Paragraph,
                            required: true,
                            maxLength: 1010,
                            minLength: 2
                        },
                    ]
                }, buttonInteraction);

                if (!modalInteraction) return;

                try {
                    const response = modalInteraction.fields.getTextInputValue('xpMessage-input');

                    const newEmbed = EmbedBuilder.from(helpEmbed).setFields(
                        {
                            name: data.ranksSetMessage_help_embed_fields_custom_name,
                            value: response ? `\`\`\`${response}\`\`\`\n${client.method.generateCustomMessagePreview(response,
                                {
                                    user: interaction.user,
                                    guild: interaction.guild!,
                                    guildLocal: guildLocal,
                                    ranks: {
                                        level: "4"
                                    }
                                })}` : data.ranksSetMessage_help_embed_fields_custom_name_empy
                        },
                    );

                    await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.message`, response);
                    await modalInteraction.reply({
                        content: data.ranksSetMessage_command_work_on_enable
                            .replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
                        ephemeral: true
                    });
                    newEmbed.addFields(helpEmbed.data.fields![1]);
                    await message.edit({ embeds: [newEmbed] });

                    await client.method.iHorizonLogs.send(interaction, {
                        title: data.ranksSetMessage_logs_embed_title_on_enable,
                        description: data.ranksSetMessage_logs_embed_description_on_enable
                            .replace("${interaction.user.id}", interaction.user.id)
                    });
                } catch (e) {
                    logger.err(e as any);
                }
            } else if (buttonInteraction.customId === "xpMessage-default-message") {
                const newEmbed = EmbedBuilder.from(helpEmbed).setFields(
                    {
                        name: data.ranksSetMessage_help_embed_fields_custom_name,
                        value: data.ranksSetMessage_help_embed_fields_custom_name_empy
                    },
                );

                await client.db.delete(`${interaction.guildId}.GUILD.XP_LEVELING.message`);
                await buttonInteraction.reply({
                    content: data.ranksSetMessage_command_work_on_enable
                        .replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
                    ephemeral: true
                });

                newEmbed.addFields(helpEmbed.data.fields![1]);
                await message.edit({ embeds: [newEmbed] });

                await client.method.iHorizonLogs.send(interaction, {
                    title: data.ranksSetMessage_logs_embed_title_on_disable,
                    description: data.ranksSetMessage_logs_embed_description_on_disable
                        .replace("${interaction.user.id}", interaction.user.id)
                });
            }
        });

        collector.on('end', async () => {
            buttons.components.forEach(x => {
                x.setDisabled(true)
            })
            await message.edit({ components: [buttons] });
        });
    },
};
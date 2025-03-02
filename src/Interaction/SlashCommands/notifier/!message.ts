/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
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
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {        


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let notifyMessage = await client.db.get(`${interaction.guildId}.NOTIFIER.message`);
        let guildLocal = await client.db.get(`${interaction.guild.id}.GUILD.LANG.lang`) || "en-US";

        notifyMessage = notifyMessage?.substring(0, 1010);

        const helpEmbed = new EmbedBuilder()
            .setColor("#ffb3cc")
            .setTitle(lang.notifier_config_message_helpEmbed_title)
            .setDescription(lang.notifier_config_message_helpEmbed_desc)
            .addFields(
                {
                    name: lang.ranksSetMessage_help_embed_fields_custom_name,
                    value: notifyMessage ? `\`\`\`${notifyMessage}\`\`\`\n${client.func.method.generateCustomMessagePreview(notifyMessage,
                        {
                            user: interaction.user,
                            guild: interaction.guild!,
                            guildLocal: guildLocal,
                        },
                    )}` : lang.ranksSetMessage_help_embed_fields_custom_name_empy
                },
                {
                    name: lang.ranksSetMessage_help_embed_fields_default_name_empy,
                    value: `\`\`\`${lang.notifier_on_new_media_default_message}\`\`\`\n${client.func.method.generateCustomMessagePreview(lang.notifier_on_new_media_default_message,
                        {
                            user: interaction.user,
                            guild: interaction.guild!,
                            guildLocal: guildLocal,
                        },
                    )}`
                }
            );

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("notifyMessage-set-message")
                    .setLabel(lang.ranksSetMessage_button_set_name)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("notifyMessage-default-message")
                    .setLabel(lang.ranksSetMessage_buttom_del_name)
                    .setStyle(ButtonStyle.Danger),
            );

        const message = await client.func.method.interactionSend(interaction, {
            embeds: [helpEmbed],
            components: [buttons]
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 80_000
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({ content: lang.help_not_for_you, ephemeral: true });
                return;
            };

            if (buttonInteraction.customId === "notifyMessage-set-message") {
                let modalInteraction = await iHorizonModalResolve({
                    customId: 'notifyMessage-Modal',
                    title: lang.notifier_config_message_awaiting_response,
                    deferUpdate: false,
                    fields: [
                        {
                            customId: 'notifyMessage-input',
                            label: lang.notifier_config_message_embed_fields_notifyMessage,
                            style: TextInputStyle.Paragraph,
                            required: true,
                            maxLength: 1010,
                            minLength: 2
                        },
                    ]
                }, buttonInteraction);

                if (!modalInteraction) return;

                try {
                    const response = modalInteraction.fields.getTextInputValue('notifyMessage-input');

                    const newEmbed = EmbedBuilder.from(helpEmbed).setFields(
                        {
                            name: lang.ranksSetMessage_help_embed_fields_custom_name,
                            value: response ? `\`\`\`${response}\`\`\`\n${client.func.method.generateCustomMessagePreview(response,
                                {
                                    user: interaction.user,
                                    guild: interaction.guild!,
                                    guildLocal: guildLocal,
                                })}` : lang.ranksSetMessage_help_embed_fields_custom_name_empy
                        },
                    );

                    await client.db.set(`${interaction.guildId}.NOTIFIER.message`, response);
                    await modalInteraction.reply({
                        content: lang.notifier_config_message_command_work_on_enable
                            .replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
                        ephemeral: true
                    });
                    newEmbed.addFields(helpEmbed.data.fields![1]);
                    await message.edit({ embeds: [newEmbed] });

                    // await client.func.ihorizon_logs(interaction, {
                    //     title: lang.ranksSetMessage_logs_embed_title_on_enable,
                    //     description: lang.ranksSetMessage_logs_embed_description_on_enable
                    //         .replace("${interaction.user.id}", interaction.user.id)
                    // });
                } catch (e) {
                    logger.err(e as any);
                }
            } else if (buttonInteraction.customId === "notifyMessage-default-message") {
                const newEmbed = EmbedBuilder.from(helpEmbed).setFields(
                    {
                        name: lang.ranksSetMessage_help_embed_fields_custom_name,
                        value: lang.ranksSetMessage_help_embed_fields_custom_name_empy
                    },
                );

                await client.db.delete(`${interaction.guildId}.NOTIFIER.message`);
                await buttonInteraction.reply({
                    content: lang.notifier_config_message_command_work_on_enable
                        .replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
                    ephemeral: true
                });

                newEmbed.addFields(helpEmbed.data.fields![1]);
                await message.edit({ embeds: [newEmbed] });

                // await client.func.ihorizon_logs(interaction, {
                //     title: lang.ranksSetMessage_logs_embed_title_on_disable,
                //     description: lang.ranksSetMessage_logs_embed_description_on_disable
                //         .replace("${interaction.user.id}", interaction.user.id)
                // });
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
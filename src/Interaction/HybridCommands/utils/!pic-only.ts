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
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    RoleSelectMenuBuilder,
    RoleSelectMenuInteraction,
    ComponentType,
    Role,
    PermissionFlagsBits,
    Message,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputStyle
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { Command } from '../../../../types/command.js';

import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let all_channels = await client.db.get(`${interaction.guildId}.UTILS.picOnly`) || [] as DatabaseStructure.UtilsData["picOnly"];
        let baseData: DatabaseStructure.PicOnlyConfig = await client.db.get(`${interaction.guildId}.UTILS.picOnlyConfig`) || {
            threshold: 3,
            muteTime: 600000
        };

        let embed = new EmbedBuilder()
            .setTitle(lang.utils_pic_only_embed_title)
            .setColor("#475387")
            .setDescription(lang.utils_pic_only_emnbed_desc)
            .setFields(
                {
                    name: lang.joinghostping_add_ok_embed_fields_name,
                    value: Array.isArray(all_channels) && all_channels.length > 0
                        ? all_channels.map(x => `<#${x}>`).join(', ')
                        : lang.setjoinroles_var_none
                },
                {
                    name: lang.antispam_manage_choices_12_label,
                    value: String(baseData?.threshold || 3),
                    inline: true
                },
                {
                    name: lang.utils_piconly_embed_fields_3_name,
                    value: String(client.timeCalculator.to_beautiful_string(baseData.muteTime!, lang) || client.timeCalculator.to_beautiful_string("10m", lang)),
                    inline: true
                },
            );

        let channelSelectMenu = new ChannelSelectMenuBuilder()
            .setCustomId('utils-picOnly-role-selecter')
            .setChannelTypes([ChannelType.GuildText])
            .setMaxValues(25)
            .setMinValues(0);

        let choiceSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('utils-picOnly-option-selecter')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(lang.utils_piconly_select1_option1_label)
                    .setValue("utils-picOnly-option-change-time"),
                new StringSelectMenuOptionBuilder()
                    .setLabel(lang.utils_piconly_select1_option2_label)
                    .setValue("utils-picOnly-option-change-threshold")
            );

        if (all_channels !== undefined && all_channels?.length >= 1) {
            const channels: string[] = Array.isArray(all_channels) ? all_channels : [all_channels];
            channelSelectMenu.setDefaultChannels(channels);
        }

        let saveButton = new ButtonBuilder()
            .setCustomId('utils-picOnly-save-button')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💾');

        let comp = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelectMenu);
        let comp_1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(choiceSelectMenu);
        let comp_2 = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);

        let og_response = await client.func.method.interactionSend(interaction, {
            embeds: [embed],
            components: [comp, comp_1, comp_2]
        });

        const collector = og_response.createMessageComponentCollector({
            componentType: ComponentType.ChannelSelect,
            time: 240_000,
            filter: (i) => i.user.id === interaction.member?.user.id
        });

        const collector_1 = og_response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 240_000,
            filter: (i) => i.user.id === interaction.member?.user.id
        });

        const buttonCollector = og_response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 240_000,
            filter: (i) => i.user.id === interaction.member?.user.id
        });

        collector.on('collect', async (channelInteraction) => {
            all_channels = channelInteraction.values;

            if (!channelInteraction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await channelInteraction.deferUpdate();
                await client.func.method.interactionSend(interaction, { content: lang.setjoinroles_var_perm_issue, ephemeral: true });
                return;
            }


            await channelInteraction.deferUpdate();
            updateEmbed(embed, all_channels, lang);
            await og_response.edit({ embeds: [embed] });
        });


        collector_1.on('collect', async (stringInteraction) => {

            if (stringInteraction.values[0] === "utils-picOnly-option-change-time") {
                let response = await iHorizonModalResolve({
                    title: lang.utils_piconly_modal1_title,
                    customId: "pic_only_time_config",
                    deferUpdate: true,

                    fields: [
                        {
                            customId: "case_value",
                            placeHolder: lang.utils_piconly_modal1_fields1_placeholder,
                            label: lang.utils_piconly_modal1_fields1_label,
                            style: TextInputStyle.Short,
                            maxLength: 8,
                            minLength: 2,
                            required: true
                        }
                    ]
                }, stringInteraction);

                let calculedTime = client.timeCalculator.to_ms(response?.fields.getTextInputValue("case_value")!) || 600000;

                baseData.muteTime = 1296000000 < calculedTime ? 600000 : calculedTime

                updateEmbed(embed, all_channels, lang);
                await og_response.edit({ embeds: [embed] });
                await client.db.set(`${interaction.guildId}.UTILS.picOnlyConfig`, baseData);
            } else if (stringInteraction.values[0] === "utils-picOnly-option-change-threshold") {
                let response = await iHorizonModalResolve({
                    title: lang.utils_piconly_modal2_title,
                    customId: "pic_only_threshold_config",
                    deferUpdate: true,

                    fields: [
                        {
                            customId: "case_value",
                            placeHolder: lang.utils_piconly_modal2_fields1_placeholder,
                            label: lang.utils_piconly_modal2_fields1_label,
                            style: TextInputStyle.Short,
                            maxLength: 4,
                            minLength: 1,
                            required: true
                        }
                    ]
                }, stringInteraction);

                let threshold = parseInt(response?.fields.getTextInputValue("case_value")!);

                baseData.threshold = 15 < threshold ? 3 : threshold

                updateEmbed(embed, all_channels, lang);
                await og_response.edit({ embeds: [embed] });
                await client.db.set(`${interaction.guildId}.UTILS.picOnlyConfig`, baseData);
            }
        });

        buttonCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            await buttonInteraction.deferUpdate();
            if (buttonInteraction.customId === 'utils-picOnly-save-button') {
                let newComp_2 = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        saveButton
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(client.iHorizon_Emojis.icon.Yes_Logo)
                            .setDisabled(true)
                    );

                await og_response.edit({ components: [newComp_2] });

                await client.db.set(`${interaction.guildId}.UTILS.picOnly`, all_channels);
                collector.stop();
                buttonCollector.stop();
            }
        });

        collector.on('end', async () => {
            comp.components.forEach(x => {
                x.setDisabled(true)
            });

            comp_1.components.forEach(x => {
                x.setDisabled(true);
            })

            comp_2.components.forEach(x => {
                x.setDisabled(true);
            })

            await og_response.edit({ components: [comp, comp_1, comp_2] });
        });

        function updateEmbed(embed: EmbedBuilder, roles: string[], lang: LanguageData) {
            embed.setFields(
                {
                    name: lang.joinghostping_add_ok_embed_fields_name,
                    value: roles.map(role => `<#${role}>`).join(', ') || lang.setjoinroles_var_none
                },
                {
                    name: lang.antispam_manage_choices_12_label,
                    value: String(baseData?.threshold || 3),
                    inline: true
                },
                {
                    name: lang.utils_piconly_embed_fields_3_name,
                    value: String(client.timeCalculator.to_beautiful_string(baseData.muteTime!, lang) || client.timeCalculator.to_beautiful_string("10m", lang)),
                    inline: true
                }
            );
        };
    },
};
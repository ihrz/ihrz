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
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputStyle,
} from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';

import { LanguageData } from '../../../../types/languageData';
import { AntiSpam } from '../../../../types/antispam';

type AntiSpamOptionKey = keyof AntiSpam.AntiSpamOptions;

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, lang: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: lang.addmoney_not_admin });
            return;
        };

        const baseData: AntiSpam.AntiSpamOptions = await client.db.get(`${interaction.guildId}.GUILD.ANTISPAM`) || {
            ignoreBots: true,
            maxDuplicatesInterval: 4000,
            maxInterval: 5000,
            Enabled: true,
            Threshold: 5,
            maxDuplicates: 6,
            removeMessages: true,
            punishment_type: 'mute',
            punishTime: client.timeCalculator.to_ms('30s')!,
            punishTimeMultiplier: true,
            similarMessageThreshold: 5,
            intervalBetweenWarn: 10_000,
        }

        const embed = new EmbedBuilder()
            .setColor("#6666ff")
            .setTitle(lang.antispam_manage_embed_title)
            .setThumbnail(interaction.guild?.iconURL({ forceStatic: false })!)
            .setFooter({
                text: "iHorizon",
                iconURL: interaction.client.user.displayAvatarURL({ forceStatic: false })
            });

        const choices: {
            label: string;
            description: string;
            value: string;
            type: 'boolean' | 'punish' | 'number';
            componentType: ComponentType | 'modal';
            wantedValueType?: 'time' | 'number'
        }[] = [
                {
                    label: lang.antispam_manage_choices_1_label,
                    description: lang.antispam_manage_choices_1_desc,
                    value: 'Enabled',
                    type: 'boolean',

                    componentType: ComponentType.StringSelect,
                },
                {
                    label: lang.antispam_manage_choices_2_label,
                    description: lang.antispam_manage_choices_2_desc,
                    value: 'ignoreBots',
                    type: 'boolean',

                    componentType: ComponentType.StringSelect,
                },
                {
                    label: lang.antispam_manage_choices_3_label,
                    description: lang.antispam_manage_choices_3_desc,
                    value: 'punishment_type',
                    type: 'punish',

                    componentType: ComponentType.StringSelect,
                },
                {
                    label: lang.antispam_manage_choices_4_label,
                    description: lang.antispam_manage_choices_4_desc,
                    value: 'punishTime',
                    type: 'number',

                    componentType: 'modal',
                    wantedValueType: 'time'
                },
                {
                    label: lang.antispam_manage_choices_5_label,
                    description: lang.antispam_manage_choices_5_desc,
                    value: 'punishTimeMultiplier',
                    type: 'boolean',

                    componentType: ComponentType.StringSelect,
                },
                {
                    label: lang.antispam_manage_choices_6_label,
                    description: lang.antispam_manage_choices_6_desc,
                    value: 'removeMessages',
                    type: 'boolean',

                    componentType: ComponentType.StringSelect,
                },
                {
                    label: lang.antispam_manage_choices_7_label,
                    description: lang.antispam_manage_choices_7_desc,
                    value: 'maxInterval',
                    type: 'number',

                    componentType: 'modal',
                    wantedValueType: 'time'
                },
                {
                    label: lang.antispam_manage_choices_8_label,
                    description: lang.antispam_manage_choices_8_desc,
                    value: 'maxDuplicates',
                    type: 'number',

                    componentType: 'modal',
                    wantedValueType: 'number'
                },
                {
                    label: lang.antispam_manage_choices_9_label,
                    description: lang.antispam_manage_choices_9_desc,
                    value: 'maxDuplicatesInterval',
                    type: 'number',

                    componentType: 'modal',
                    wantedValueType: 'time'
                },
                {
                    label: lang.antispam_manage_choices_10_label,
                    description: lang.antispam_manage_choices_10_desc,
                    value: 'similarMessageThreshold',
                    type: 'number',

                    componentType: 'modal',
                    wantedValueType: 'number'
                },
                {
                    label: lang.antispam_manage_choices_11_label,
                    description: lang.antispam_manage_choices_11_desc,
                    value: 'intervalBetweenWarn',
                    type: 'number',

                    componentType: 'modal',
                    wantedValueType: 'time'
                },
                {
                    label: lang.antispam_manage_choices_12_label,
                    description: lang.antispam_manage_choices_12_desc,
                    value: 'Threshold',
                    type: 'number',

                    componentType: 'modal',
                    wantedValueType: 'number'
                },
            ]

        choices.forEach((content, x) => {
            let value: string = '';
            let inDb = baseData?.[content.value as AntiSpamOptionKey];

            switch (content.type) {
                case 'boolean':
                    value = inDb === true ? "🟢 " + lang.guildprofil_set_blockpub : inDb !== undefined ? "🔴 " + lang.setjoinroles_var_none : "🔴 " + lang.guildprofil_not_set_blockpub
                    break;
                case 'number':
                    if (inDb) {
                        if (content.wantedValueType === 'number') {
                            value = inDb.toString()
                        } else if (content.wantedValueType === 'time') {
                            let beautifulTime = client.timeCalculator.to_beautiful_string(inDb.toString() + 'ms');

                            if (!beautifulTime) {
                                value = '⏲️ ' + lang.setjoinroles_var_none
                            } else {
                                value = beautifulTime
                            }
                        }
                    }
                    break;
                case 'punish':
                    value = inDb !== undefined ? String(inDb) : `🔥 ` + lang.setjoinroles_var_none;
                    break;
            }
            embed.addFields({
                name: content.label,
                value: "`" + value + "`",
                inline: true
            });
        });

        const select = new StringSelectMenuBuilder()
            .setCustomId('antispam-select-config')
            .setPlaceholder(lang.help_select_menu)
            .addOptions(choices);

        const button = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setCustomId("antispam-manage-save-button")
            .setLabel(lang.antispam_manage_button_label);

        const originalResponse = await interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                new ActionRowBuilder<ButtonBuilder>().addComponents(button)
            ]
        });

        const collector = originalResponse.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 240_000,
        });

        const buttonCollector = originalResponse.createMessageComponentCollector({
            time: 240_000,
            componentType: ComponentType.Button,
        });

        buttonCollector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: lang.help_not_for_you, ephemeral: true });
                return;
            };

            await client.db.set(`${interaction.guildId}.GUILD.ANTISPAM`, baseData);

            await i.deferUpdate();

            collector.stop();
            buttonCollector.stop();
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: lang.help_not_for_you, ephemeral: true });
                return;
            };

            let value = i.values[0];
            let choicesGet = choices.find(x => x.value === value);

            if (choicesGet?.componentType === 'modal') {
                let result = await iHorizonModalResolve({
                    customId: 'antispam-modal-config',
                    title: lang.antispam_manage_modal_title,
                    deferUpdate: false,
                    fields: [
                        {
                            customId: value,
                            style: TextInputStyle.Short,
                            required: true,
                            label: choicesGet.label,
                            placeHolder: choicesGet.description,
                            minLength: 1
                        },
                    ]
                }, i);

                if (!result) return;

                let resultModal = result.fields.getTextInputValue(value);

                if (choicesGet.wantedValueType === 'time') {
                    const fieldIndex = choices.findIndex(x => x.value === choicesGet.value);
                    const formatedTime = client.timeCalculator.to_ms(resultModal);

                    if (!formatedTime) {
                        await result.reply({ content: `${interaction.user.toString()} invalide time!`, ephemeral: true })
                        return;
                    }

                    await result.deferUpdate();

                    if (embed.data.fields && fieldIndex !== -1) {
                        embed.data.fields[fieldIndex].value = `\`${resultModal}\``;
                    }
                    await originalResponse.edit({ embeds: [embed] });

                    (baseData[choicesGet.value as AntiSpamOptionKey] as number) = formatedTime;
                } else if (choicesGet.wantedValueType === 'number') {
                    const fieldIndex = choices.findIndex(x => x.value === choicesGet.value);
                    const isNumber = parseInt(resultModal);

                    if (embed.data.fields && fieldIndex !== -1) {
                        embed.data.fields[fieldIndex].value = `\`${resultModal}\``;
                    }
                    await originalResponse.edit({ embeds: [embed] });
                    await result.deferUpdate();

                    (baseData[choicesGet.value as AntiSpamOptionKey] as number) = parseInt(resultModal);
                }
            } else if (choicesGet?.componentType === ComponentType.StringSelect && choicesGet.type === 'boolean') {
                let select = new StringSelectMenuBuilder()
                    .setCustomId("antispam-manage-yes-or-no")
                    .setPlaceholder(choicesGet.description)
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(lang.mybot_submit_utils_msg_yes)
                            .setValue("antispam-manage-yes"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(lang.mybot_submit_utils_msg_no)
                            .setValue("antispam-manage-no")
                    );

                await i.reply({
                    content: `${interaction.user.toString()}`,
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
                })

                const response = await i.channel?.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    filter: (m) => m.customId === 'antispam-manage-yes-or-no',
                    time: 120_000,
                });

                if (response) {
                    response.deferUpdate();

                    if (response.values[0] === 'antispam-manage-yes') {
                        await response.deleteReply();

                        const fieldIndex = choices.findIndex(x => x.value === choicesGet.value);

                        if (embed.data.fields && fieldIndex !== -1) {
                            embed.data.fields[fieldIndex].value = `\`🟢 ${lang.guildprofil_set_blockpub}\``;
                        }
                        await originalResponse.edit({ embeds: [embed] });

                        ((baseData[choicesGet.value as AntiSpamOptionKey] as boolean) = true);
                    } else if (response.values[0] === 'antispam-manage-no') {
                        await response.deleteReply();

                        const fieldIndex = choices.findIndex(x => x.value === choicesGet.value);

                        if (embed.data.fields && fieldIndex !== -1) {
                            embed.data.fields[fieldIndex].value = `\`🔴 ${lang.guildprofil_not_set_blockpub}\``;
                        }
                        await originalResponse.edit({ embeds: [embed] });

                        ((baseData[choicesGet.value as AntiSpamOptionKey] as boolean) = false);
                    };
                }
            } else if (choicesGet?.type === 'punish') {
                let select = new StringSelectMenuBuilder()
                    .setCustomId("antispam-manage-punish-type")
                    .setPlaceholder(choicesGet.description)
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(lang.setjoinroles_var_perm_ban_members)
                            .setValue("antispam-manage-ban"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(lang.setjoinroles_var_perm_kick_members)
                            .setValue("antispam-manage-kick"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(lang.antispam_manage_select_menu_punish_mute_label)
                            .setValue("antispam-manage-mute")
                    );


                let answer = await i.reply({
                    content: `${interaction.user.toString()}`,
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
                });

                const response = await i.channel?.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    filter: (m) => m.customId === 'antispam-manage-punish-type',
                    time: 120_000,
                });

                if (!response) return;

                let collectedResponse = response.values[0];
                const fieldIndex = choices.findIndex(x => x.value === choicesGet.value);

                await answer.delete();

                if (embed.data.fields && fieldIndex !== -1) {
                    if (collectedResponse.endsWith('kick')) {
                        embed.data.fields[fieldIndex].value = "`kick`";
                    } else if (collectedResponse.endsWith('ban')) {
                        embed.data.fields[fieldIndex].value = "`ban`";
                    } else if (collectedResponse.endsWith('mute')) {
                        embed.data.fields[fieldIndex].value = "`mute`";
                    };
                };
                await originalResponse.edit({ embeds: [embed] });
                (baseData[choicesGet.value as AntiSpamOptionKey] as string) = collectedResponse.split('-')[2]!;
            }

        });

        collector.on('end', async () => {
            await interaction.editReply({
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select.setDisabled(true)),
                    new ActionRowBuilder<ButtonBuilder>().addComponents(button.setDisabled(true))
                ]
            });
        });
    },
};
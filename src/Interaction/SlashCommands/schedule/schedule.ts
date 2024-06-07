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
    Client,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ComponentType,
    TextInputStyle,
    Collection,
    ChatInputCommandInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction,
    CacheType,
    TextInputComponent,
    ApplicationCommandType
} from 'discord.js';

import { format } from '../../../core/functions/date-and-time.js';

import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';
import { generatePassword } from '../../../core/functions/random.js';
import { LanguageData } from '../../../../types/languageData.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';

export const command: Command = {
    name: "schedule",
    description: "Manager for schedule category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de message pré-programmer"
    },
    category: 'schedule',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {

        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let table = client.db.table("SCHEDULE");

        let select = new StringSelectMenuBuilder()
            .setCustomId('starter')
            .setPlaceholder(data.schedule_menu_placeholder)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.schedule_menu_choice_0)
                    .setEmoji("📝")
                    .setValue('0'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.schedule_menu_choice_1)
                    .setEmoji("🗑️")
                    .setValue('1'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.schedule_menu_choice_2)
                    .setEmoji("⚠️")
                    .setValue('2'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.schedule_menu_choice_3)
                    .setEmoji("📜")
                    .setValue('3'),
            );

        let response = await interaction.reply({
            content: interaction.user.toString(),
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            ],
        });

        try {

            let collector = response.createMessageComponentCollector({
                filter: (member) => member.user.id === interaction.user.id,
                componentType: ComponentType.StringSelect,
                time: 420_000
            });

            collector.on('collect', async i => {
                if (i.member?.user.id !== interaction.user.id) {
                    await i.reply({ content: data.embed_interaction_not_for_you, ephemeral: true })
                    return;
                }
                await chooseAction(i);
            });

        } catch (e) {
            return await interaction.reply({ content: data.embed_timeout_getbtn });
        };

        async function chooseAction(i: StringSelectMenuInteraction) {
            switch (i.values[0]) {
                case '0':
                    let response = await iHorizonModalResolve({
                        customId: 'modal',
                        title: data.schedule_modal_title,
                        fields: [
                            {
                                customId: 'name',
                                label: data.schedule_modal_fields_1_label,
                                style: TextInputStyle.Short,
                                required: true,
                                maxLength: 30,
                                minLength: 5
                            },
                            {
                                customId: 'desc',
                                label: data.schedule_modal_fields_2_label,
                                style: TextInputStyle.Paragraph,
                                required: true,
                                maxLength: 400,
                                minLength: 10
                            },
                        ]
                    }, interaction);

                    if (!response) return;
                    executeAfterModal(response);
                    break;
                case '1':
                    let u = await i.reply({ content: data.schedule_delete_question, ephemeral: false });

                    let deleteCollector = interaction.channel?.createMessageCollector({
                        filter: (m) => m.author.id === interaction.user.id,
                        max: 1,
                        time: 120_000
                    });

                    deleteCollector?.on('collect', async (message) => {
                        await message.delete() && u.delete();
                        deleteCollector?.stop();
                        __1(message.content);
                    });
                    break;
                case '2':
                    let u2 = await i.reply({ content: data.schedule_deleteall_question, ephemeral: false });
                    let deleteAllCollector = interaction.channel?.createMessageCollector({
                        filter: (m) => m.author.id === interaction.user.id,
                        max: 1,
                        time: 120_000
                    });

                    deleteAllCollector?.on('collect', async (message) => {
                        await message.delete() && u2.delete();
                        deleteAllCollector?.stop();
                        if (message.content.toLowerCase() === 'y' || message.content.toLowerCase() === 'yes') {
                            __2(true);
                        } else {
                            __2(false);
                        };
                    });
                    break;
                case '3':
                    await i.deferUpdate();
                    __3();
                    break;
                default:
                    break;
            };

            async function __1(arg0: string) {
                let fetched = await table.get(`${interaction.user.id}`);

                if (!fetched || !fetched[arg0]) {
                    await response.edit({
                        content: data.schedule_delete_not_found
                            .replace('${arg0}', arg0), embeds: []
                    });
                    return;
                } else {
                    let embed = new EmbedBuilder()
                        .setAuthor({
                            name: interaction.user.globalName || interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL({ extension: 'png', size: 512 })
                        })
                        .setTitle(data.schedule_delete_title_embed
                            .replace('${arg0}', arg0)
                        )
                        .setThumbnail(interaction.guild?.iconURL() as string)
                        .setColor('#ff0a0a')
                        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                        .setTimestamp();

                    await table.delete(`${interaction.user.id}.${arg0}`);
                    await response.edit({
                        content: data.schedule_delete_confirm, embeds: [embed],
                        files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
                    });
                    return;
                };
            };

            async function __2(arg0: boolean) {
                if (arg0) {
                    await table.delete(`${interaction.user.id}`);

                    let embed = new EmbedBuilder()
                        .setColor('#ff0a0a')
                        .setAuthor({
                            name: interaction.user.globalName || interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL({ extension: 'png', size: 512 })
                        })
                        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                        .setTitle(data.schedule_deleteall_title_embed)
                        .setDescription(data.schedule_deleteall_desc_embed)

                    await response.edit({
                        content: data.schedule_deleteall_confirm,
                        embeds: [embed],
                        files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
                    });
                } else {
                    await response.edit({
                        content: data.schedule_deleteall_cancel,
                    });
                    return;
                }
            };

            async function __3() {
                let fetched = await table.get(`${interaction.user.id}`);

                if (!fetched) {
                    await response.edit({ content: data.schedule_list_not_schedule, embeds: [] });
                    return;
                };

                let embed = new EmbedBuilder()
                    .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                    .setTitle(data.schedule_list_title_embed)
                    .setColor('#60BEE0')
                    .setAuthor({
                        name: interaction.user.globalName || interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ extension: 'png', size: 512 })
                    });

                for (let i in fetched) {
                    embed.addFields({
                        name: `#${i}`, value: data.schedule_list_fields_embed
                            .replace("${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}",
                                format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')
                            )
                            .replace('${fetched[i]?.title}', fetched[i]?.title)
                            .replace('${fetched[i]?.description}', fetched[i]?.description)
                    });
                };

                await response.edit({
                    content: data.schedule_list_content_message,
                    embeds: [embed],
                    files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
                });
            };

            async function executeAfterModal(i: ModalSubmitInteraction<CacheType>) {
                let collection = i.fields.fields;
                let nameValue = collection.get('name')?.value;
                let descValue = collection.get('desc')?.value;

                let embed = new EmbedBuilder()
                    .setDescription(`\`\`\`${nameValue}\`\`\`\`\`\`${descValue}\`\`\``)
                    .setAuthor({
                        name: interaction.user.globalName || interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ extension: 'png', size: 512 })
                    })
                    .setTitle(data.schedule_create_title_embed)
                    .setThumbnail(interaction.guild?.iconURL() as string)
                    .setColor('#00549f')
                    .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                    .setTimestamp();

                await response.edit({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
                let u = await i.reply({ content: data.schedule_create_when_question });

                let dateCollector = interaction.channel?.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 120_000
                });

                dateCollector?.on('collect', async (message) => {
                    await message.delete() && u.delete();
                    dateCollector?.stop();
                    __0(client.timeCalculator.to_ms(message.content)!, collection);
                });


                async function __0(date0: number, collection: Collection<string, TextInputComponent>) {
                    var scheduleCode = generatePassword({ length: 16 });

                    if (Number.isNaN(date0)) {
                        response.edit({
                            embeds: [],
                            content: data.schedule_create_not_number_time
                                .replace('${interaction.user}', interaction.user.toString()),
                        });
                        return;
                    };

                    response.edit({
                        embeds: [
                            embed.addFields({
                                name: data.schedule_create_embed_fields_name_confirm,
                                value: format(Date.now() + date0, 'YYYY/MM/DD HH:mm:ss'),
                                inline: true
                            }).setTitle(data.schedule_create_embed_title_confirm.replace('${scheduleCode}', scheduleCode))
                        ],
                        content: data.schedule_create_confirm_msg
                            .replace('${interaction.user}', interaction.user.toString())
                            .replace('${scheduleCode}', scheduleCode)
                    });

                    await table.set(`${interaction.user.id}.${scheduleCode}`,
                        {
                            title: collection.get('name')?.value,
                            description: collection.get('desc')?.value,
                            expired: Date.now() + date0
                        }
                    );
                };
            };
        };
    },
};
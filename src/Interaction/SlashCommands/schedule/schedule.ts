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
    Client,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ComponentType,
    ModalBuilder,
    TextInputStyle,
    TextInputBuilder,
    Collection,
    ChatInputCommandInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction,
    CacheType,
    TextInputComponent,
    ApplicationCommandType
} from 'discord.js';

import { Command } from '../../../../types/command';
import date from 'date-and-time';
import ms from 'ms';
import logger from '../../../core/logger.js';

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
        let data = await client.functions.getLanguageData(interaction.guild?.id);

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
            content: `<@${interaction.user.id}>`,
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            ],
        });

        let modal = new ModalBuilder()
            .setCustomId('modal')
            .setTitle(data.schedule_modal_title);

        let theScheduleName = new TextInputBuilder()
            .setCustomId('name')
            .setLabel(data.schedule_modal_fields_1_label)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(30)
            .setMinLength(5)
            .setRequired(true);

        let theScheduleDescription = new TextInputBuilder()
            .setCustomId('desc')
            .setLabel(data.schedule_modal_fields_2_label)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(500);

        let firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(theScheduleName)
        let secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(theScheduleDescription);

        modal.addComponents(firstActionRow, secondActionRow);

        try {

            let collector = response.createMessageComponentCollector({
                filter: (member) => member.user.id === interaction.user.id,
                componentType: ComponentType.StringSelect,
                time: 420_000
            });

            collector.on('collect', async (i) => {
                if (i.member?.user.id !== interaction.user.id) {
                    await i.reply({ content: data.embed_interaction_not_for_you, ephemeral: true })
                    return;
                }
                await chooseAction(i);
            });

        } catch (e) {
            return interaction.reply({ content: data.embed_timeout_getbtn });
        };

        async function chooseAction(i: StringSelectMenuInteraction) {
            switch (i.values[0]) {
                case '0':
                    await i.showModal(modal);
                    let filter = (i: { customId: string; }) => i.customId === 'modal';

                    i.awaitModalSubmit({ filter, time: 60_000 })
                        .then((interaction) => {
                            executeAfterModal(interaction);
                        })
                        .catch((error: any) => {
                            logger.err(error)
                        });
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
                    i.deferUpdate();
                    __3();
                    break;
                default:
                    break;
            };

            async function __1(arg0: string) {
                let fetched = await client.db.get(`SCHEDULE.${interaction.user.id}`);

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

                    await client.db.delete(`SCHEDULE.${interaction.user.id}.${arg0}`);
                    await response.edit({
                        content: data.schedule_delete_confirm, embeds: [embed],
                        files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
                    });
                    return;
                };
            };

            async function __2(arg0: boolean) {
                if (arg0) {
                    await client.db.delete(`SCHEDULE.${interaction.user.id}`);

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
                let fetched = await client.db.get(`SCHEDULE.${interaction.user.id}`);

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
                                date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')
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
                    __0(ms(message.content as unknown as number), collection);
                });


                async function __0(date0: string, collection: Collection<string, TextInputComponent>) {
                    var scheduleCode = Math.random().toString(36).slice(-8);

                    if (Number.isNaN(date0)) {
                        response.edit({
                            embeds: [],
                            content: data.schedule_create_not_number_time
                                .replace('${interaction.user}', interaction.user),
                        });
                        return;
                    };

                    response.edit({
                        embeds: [
                            embed.addFields({
                                name: data.schedule_create_embed_fields_name_confirm,
                                value: date.format(date.addMilliseconds(new Date(), date0 as unknown as number), 'YYYY/MM/DD HH:mm:ss'), inline: true
                            }).setTitle(data.schedule_create_embed_title_confirm.replace('${scheduleCode}', scheduleCode))
                        ],
                        content: data.schedule_create_confirm_msg
                            .replace('${interaction.user}', interaction.user)
                            .replace('${scheduleCode}', scheduleCode)
                    });

                    await client.db.set(`SCHEDULE.${interaction.user.id}.${scheduleCode}`,
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
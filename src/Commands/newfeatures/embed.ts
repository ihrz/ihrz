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
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'embed',
    description: 'Create a beautiful embed !',
    options: [
        {
            name: 'id',
            type: ApplicationCommandOptionType.String,
            description: 'If you have a embed\'s ID !',
            required: false,
        }
    ],
    category: 'newfeatures',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        let arg = interaction.options.getString("id");
        let potentialEmbed = await client.db.get(`EMBED.${arg}`);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.punishpub_not_admin });
            return;
        };

        let __tempEmbed = new EmbedBuilder().setDescription('** **');
        if (potentialEmbed) { __tempEmbed = new EmbedBuilder(potentialEmbed.embedSource) };

        let select = new StringSelectMenuBuilder()
            .setCustomId('starter')
            .setPlaceholder(data.embed_placeholder_string_select_menu_builder)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_copy_embed)
                    .setEmoji("📥")
                    .setValue('0'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_title)
                    .setEmoji("🖊")
                    .setValue('1'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_delete_title)
                    .setEmoji("💥")
                    .setValue('2'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_description)
                    .setEmoji("💬")
                    .setValue('3'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_delete_description)
                    .setEmoji("📝")
                    .setValue('4'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_author)
                    .setEmoji("🕵️")
                    .setValue('5'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_delete_author)
                    .setEmoji("✂")
                    .setValue('6'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_footer)
                    .setEmoji("🔻")
                    .setValue('7'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_delete_footer)
                    .setEmoji("🔺")
                    .setValue('8'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_thumbnail)
                    .setEmoji("🔳")
                    .setValue('9'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_image)
                    .setEmoji("🖼️")
                    .setValue('10'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_titleurl)
                    .setEmoji("🌐")
                    .setValue('11'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_edit_color)
                    .setEmoji("🎨")
                    .setValue('12'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.embed_placeholder_option_delete_color)
                    .setEmoji("🔵")
                    .setValue('13')
            );

        let save = new ButtonBuilder()
            .setCustomId('save')
            .setLabel(data.embed_btn_save)
            .setStyle(ButtonStyle.Success);

        let send = new ButtonBuilder()
            .setCustomId('send')
            .setLabel(data.embed_btn_send)
            .setStyle(ButtonStyle.Primary);

        let cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel(data.embed_btn_cancel)
            .setStyle(ButtonStyle.Danger);

        let response = await interaction.editReply({
            content: data.embed_first_message,
            embeds: [__tempEmbed],
            components: [
                new ActionRowBuilder().addComponents(select),
                new ActionRowBuilder().addComponents(save, send, cancel)
            ],
        });

        let collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 420_000
        });

        collector.on('collect', async (i: { member: { id: any; }; reply: (arg0: { content: string; ephemeral: boolean; }) => any; }) => {
            if (i.member.id !== interaction.user.id) {
                await i.reply({ content: data.embed_interaction_not_for_you, ephemeral: true })
                return;
            }
            getButton();
            await chooseAction(i);
        });

        async function getButton() {
            try {
                let collectorFilter = (i: { user: { id: any; }; }) => i.user.id === interaction.user.id;
                let confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });

                switch (confirmation.customId) {
                    case "save":
                        if (potentialEmbed) await client.db.delete(`EMBED.${arg}`);

                        await confirmation.update({
                            content: data.embed_save_message
                                .replace('${interaction.user.id}', interaction.user.id)
                                .replace('${await saveEmbed()}', (await saveEmbed())),
                            components: [], embeds: []
                        })
                        return;
                    case "cancel":
                        return confirmation.update({
                            content: data.embed_cancel_message
                                .replace('${interaction.user.id}', interaction.user.id), components: [], embeds: []
                        });
                    case "send":
                        confirmation.update({
                            content: data.embed_send_message
                                .replace('${interaction.user.id}', interaction.user.id), components: []
                        });
                        sendEmbed();
                        return;
                }
            } catch (e) {
                await interaction.channel.send({
                    content: data.embed_timeout_getbtn
                        .replace('${interaction.user.id}', interaction.user.id)
                });
                return;
            };
        }; getButton();

        let links = [
            "https://",
            "http://",
        ];

        var reg = /^#([0-9a-f]{3}){1,2}$/i;

        async function chooseAction(i: { member?: { id: any; }; reply: any; values?: any; }) {
            switch (i.values[0]) {
                case '0':
                    let i0 = await i.reply({ content: data.embed_choose_0 });

                    let messageFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, max: 1, time: 120_000 });
                    messageCollector.on('collect', (message: { content: string | null; delete: () => any; }) => {
                        __tempEmbed.setDescription(message.content);
                        response.edit({ embeds: [__tempEmbed] })
                        i0.delete() && message.delete();
                    });
                    break;
                case '1':
                    let i1 = await i.reply({ content: data.embed_choose_1 });

                    let titleFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let titleCollector = interaction.channel.createMessageCollector({ filter: titleFilter, max: 1, time: 120_000 });
                    titleCollector.on('collect', (message: { content: string | null; delete: () => any; }) => {
                        __tempEmbed.setTitle(message.content);
                        response.edit({ embeds: [__tempEmbed] })
                        i1.delete() && message.delete();
                    });
                    break;
                case '2':
                    __tempEmbed.setTitle('** **');
                    response.edit({ embeds: [__tempEmbed] });
                    i.reply({ content: data.embed_choose_2 });
                    break;
                case '3':
                    let i3 = await i.reply({ content: data.embed_choose_3 });

                    let descriptionFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let descriptionCollector = interaction.channel.createMessageCollector({ filter: descriptionFilter, max: 1, time: 120_000 });
                    descriptionCollector.on('collect', (message: { content: string | null; delete: () => any; }) => {
                        __tempEmbed.setDescription(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                        i3.delete() && message.delete();
                    });
                    break;
                case '4':
                    __tempEmbed.setDescription('** **');
                    response.edit({ embeds: [__tempEmbed] });
                    i.reply({ content: data.embed_choose_4 });
                    break;
                case '5':
                    let i5 = await i.reply({ content: data.embed_choose_5 });

                    let authorFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let authorCollector = interaction.channel.createMessageCollector({ filter: authorFilter, max: 1, time: 120_000 });
                    authorCollector.on('collect', (message: { content: any; delete: () => any; }) => {
                        __tempEmbed.setAuthor({ name: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                        i5.delete() && message.delete();
                    });
                    break;
                case '6':
                    __tempEmbed.setAuthor({ name: "      " });
                    response.edit({ embeds: [__tempEmbed] });
                    i.reply({ content: data.embed_choose_6 });
                    break;
                case '7':
                    let i7 = await i.reply({ content: data.embed_choose_7 });

                    let footerFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let footerCollector = interaction.channel.createMessageCollector({ filter: footerFilter, max: 1, time: 120_000 });
                    footerCollector.on('collect', (message: { content: any; delete: () => any; }) => {
                        __tempEmbed.setFooter({ text: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                        i7.delete() && message.delete();
                    });
                    break;
                case '8':
                    __tempEmbed.setFooter({ text: "** **" });
                    response.edit({ embeds: [__tempEmbed] });

                    i.reply({ content: data.embed_choose_8 });
                    break;
                case '9':
                    let i9 = await i.reply({ content: data.embed_choose_9 });

                    let thumbnailFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let thumbnailCollector = interaction.channel.createMessageCollector({ filter: thumbnailFilter, max: 1, time: 120_000 });
                    thumbnailCollector.on('collect', (message: { content: string | string[] | null; delete: () => any; }) => {
                        if (!links.some(word => message.content?.includes(word))) {
                            __tempEmbed.setThumbnail("https://exemple.com/exemple/png")
                        } else {
                            __tempEmbed.setThumbnail((message.content as any))
                        };

                        response.edit({ embeds: [__tempEmbed] });
                        i9.delete() && message.delete();
                    });
                    break;
                case '10':
                    let i10 = await i.reply({ content: data.embed_choose_10 });

                    let imageFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let imageCollector = interaction.channel.createMessageCollector({ filter: imageFilter, max: 1, time: 120_000 });
                    imageCollector.on('collect', (message: { content: string | string[] | null; delete: () => any; }) => {
                        if (!links.some(word => message.content?.includes(word))) {
                            __tempEmbed.setImage("https://exemple.com/exemple/png")
                        } else {
                            __tempEmbed.setImage((message.content as any))
                        };

                        response.edit({ embeds: [__tempEmbed] });
                        i10.delete() && message.delete();
                    });
                    break;
                case '11':
                    let i11 = await i.reply({ content: data.embed_choose_11 });

                    let ttUrlFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let ttUrlCollector = interaction.channel.createMessageCollector({ filter: ttUrlFilter, max: 1, time: 120_000 });
                    ttUrlCollector.on('collect', (message: { content: string | string[] | null; delete: () => any; }) => {
                        if (links.some(word => message.content?.includes(word))) {
                            __tempEmbed.setURL((message.content as any)) && response.edit({ embeds: [__tempEmbed] });
                        };

                        i11.delete() && message.delete();
                    });
                    break;
                case '12':
                    let i12 = await i.reply({ content: data.embed_choose_12 });

                    let colorFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
                    let colorCollector = interaction.channel.createMessageCollector({ filter: colorFilter, max: 1, time: 120_000 });
                    colorCollector.on('collect', (message: { content: string | number | readonly [red: number, green: number, blue: number] | null; delete: () => any; }) => {
                        if (reg.test((message.content as any))) {
                            __tempEmbed.setColor((message.content as any));
                            response.edit({ embeds: [__tempEmbed] });
                        } else {
                            interaction.channel.send({ content: data.embed_choose_12_error });
                        }

                        i12.delete() && message.delete();
                    });
                    break;
                case '13':
                    __tempEmbed.setColor("#000000");
                    response.edit({ embeds: [__tempEmbed] });
                    i.reply({ content: data.embed_choose_13 });
                    break;
                default:
                    break;
            };
        }

        async function sendEmbed() {
            let seFilter = (m: { author: { id: any; }; }) => m.author.id === interaction.user.id;
            let seCollector = interaction.channel.createMessageCollector({ filter: seFilter, max: 1, time: 120_000 });

            seCollector.on('collect', (message: { content: any; delete: () => void; }) => {
                let channel = interaction.guild.channels.cache.get(message.content)

                if (!channel) return;
                channel.send({ embeds: [__tempEmbed] });
                message.delete();
                response.edit({
                    content: data.embed_send_embed_work
                        .replace('${interaction.user.id}', interaction.user.id)
                        .replace('${message.content}', message.content), embeds: []
                });
            });
        };

        async function saveEmbed() {
            var password = Math.random().toString(36).slice(-8);
            await client.db.set(`EMBED.${password}`,
                {
                    embedOwner: interaction.user.id,
                    embedSource: __tempEmbed
                }
            );
            return password;
        };
    },
};
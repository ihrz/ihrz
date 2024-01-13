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
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    CacheType,
    ChatInputCommandInteraction,
    Client,
    ColorResolvable,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {

    name: 'embed',

    description: 'Create a beautiful embed !',
    description_localizations: {
        "fr": "Créez un magnifique embed"
    },

    thinking: true,
    category: 'utils',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        let arg = args[0];
        let potentialEmbed = await client.db.get(`EMBED.${arg}`);

        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.punishpub_not_admin });
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

        let response = await interaction.reply({
            content: data.embed_first_message,
            embeds: [__tempEmbed],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                new ActionRowBuilder<ButtonBuilder>().addComponents(save, send, cancel)
            ],
        });

        let collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 420_000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.author.id) {
                await i.reply({ content: data.embed_interaction_not_for_you, ephemeral: true })
                return;
            }
            getButton();
            await chooseAction(i);
        });

        async function getButton() {
            try {
                let confirmation = await response.awaitMessageComponent({ filter: (i) => i.user.id === interaction.author.id, time: 120_000 });

                switch (confirmation.customId) {
                    case "save":
                        if (potentialEmbed) await client.db.delete(`EMBED.${arg}`);

                        await confirmation.update({
                            content: data.embed_save_message
                                .replace('${interaction.user.id}', interaction.author.id)
                                .replace('${await saveEmbed()}', (await saveEmbed())),
                            components: [], embeds: []
                        })
                        return;
                    case "cancel":
                        return confirmation.update({
                            content: data.embed_cancel_message
                                .replace('${interaction.user.id}', interaction.author.id), components: [], embeds: []
                        });
                    case "send":
                        confirmation.update({
                            content: data.embed_send_message
                                .replace('${interaction.user.id}', interaction.author.id), components: []
                        });
                        sendEmbed();
                        return;
                }
            } catch (e) {
                await interaction.channel?.send({
                    content: data.embed_timeout_getbtn
                        .replace('${interaction.user.id}', interaction.author.id)
                });
                return;
            };
        }; getButton();

        let links = [
            "https://",
            "http://",
        ];

        var reg = /^#([0-9a-f]{3}){1,2}$/i;

        async function chooseAction(i: StringSelectMenuInteraction<CacheType>) {
            switch (i.values[0]) {
                case '0':
                    let i0 = await i.reply({ content: data.embed_choose_0 });

                    let messageCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    messageCollector?.on('collect', async (message) => {
                        await i0.delete(); message.delete();
                        __tempEmbed.setDescription(message.content);
                        response.edit({ embeds: [__tempEmbed] })
                    });
                    break;
                case '1':
                    let i1 = await i.reply({ content: data.embed_choose_1 });

                    let titleCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    titleCollector?.on('collect', async (message) => {
                        __tempEmbed.setTitle(message.content);
                        response.edit({ embeds: [__tempEmbed] })
                        await i1.delete(); message.delete();
                    });
                    break;
                case '2':
                    __tempEmbed.setTitle('** **');
                    response.edit({ embeds: [__tempEmbed] });
                    i.reply({ content: data.embed_choose_2 });
                    break;
                case '3':
                    let i3 = await i.reply({ content: data.embed_choose_3 });

                    let descriptionCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    descriptionCollector?.on('collect', async (message) => {
                        __tempEmbed.setDescription(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                        await i3.delete(); message.delete();
                    });
                    break;
                case '4':
                    __tempEmbed.setDescription('** **');
                    response.edit({ embeds: [__tempEmbed] });
                    i.reply({ content: data.embed_choose_4 });
                    break;
                case '5':
                    let i5 = await i.reply({ content: data.embed_choose_5 });

                    let authorCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    authorCollector?.on('collect', async (message) => {
                        __tempEmbed.setAuthor({ name: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                        await i5.delete(); message.delete();
                    });
                    break;
                case '6':
                    __tempEmbed.setAuthor({ name: "      " });
                    response.edit({ embeds: [__tempEmbed] });
                    i.reply({ content: data.embed_choose_6 });
                    break;
                case '7':
                    let i7 = await i.reply({ content: data.embed_choose_7 });

                    let footerCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    footerCollector?.on('collect', async (message) => {
                        __tempEmbed.setFooter({ text: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                        await i7.delete(); message.delete();
                    });
                    break;
                case '8':
                    __tempEmbed.setFooter({ text: "** **" });
                    response.edit({ embeds: [__tempEmbed] });

                    i.reply({ content: data.embed_choose_8 });
                    break;
                case '9':
                    let i9 = await i.reply({ content: data.embed_choose_9 });

                    let thumbnailCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    thumbnailCollector?.on('collect', async (message) => {
                        if (!links.some(word => message.content?.includes(word))) {
                            __tempEmbed.setThumbnail("https://exemple.com/exemple/png")
                        } else {
                            __tempEmbed.setThumbnail((message.content as string))
                        };

                        response.edit({ embeds: [__tempEmbed] });
                        await i9.delete(); message.delete();
                    });
                    break;
                case '10':
                    let i10 = await i.reply({ content: data.embed_choose_10 });

                    let imageCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    imageCollector?.on('collect', async (message) => {
                        if (!links.some(word => message.content?.includes(word))) {
                            __tempEmbed.setImage("https://exemple.com/exemple/png")
                        } else {
                            __tempEmbed.setImage((message.content as string))
                        };

                        response.edit({ embeds: [__tempEmbed] });
                        await i10.delete(); message.delete();
                    });
                    break;
                case '11':
                    let i11 = await i.reply({ content: data.embed_choose_11 });

                    let ttUrlCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    ttUrlCollector?.on('collect', async (message) => {
                        if (links.some(word => message.content?.includes(word))) {
                            __tempEmbed.setURL((message.content as string)) && response.edit({ embeds: [__tempEmbed] });
                        };

                        await i11.delete(); message.delete();
                    });
                    break;
                case '12':
                    let i12 = await i.reply({ content: data.embed_choose_12 });

                    let colorCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });
                    colorCollector?.on('collect', async (message) => {
                        if (reg.test((message.content as string))) {
                            __tempEmbed.setColor((message.content as ColorResolvable));
                            response.edit({ embeds: [__tempEmbed] });
                        } else {
                            interaction.channel?.send({
                                content: data.embed_choose_12_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                            });
                        }

                        await i12.delete(); message.delete();
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
            let seCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.author.id, max: 1, time: 120_000 });

            seCollector?.on('collect', (message) => {
                let channel = interaction.guild?.channels.cache.get(message.content)

                if (!channel) return;
                (channel as BaseGuildTextChannel).send({ embeds: [__tempEmbed] });
                message.delete();
                response.edit({
                    content: data.embed_send_embed_work
                        .replace('${interaction.user.id}', interaction.author.id)
                        .replace('${message.content}', message.content), embeds: []
                });
            });
        };

        async function saveEmbed() {
            var password = Math.random().toString(36).slice(-8);
            await client.db.set(`EMBED.${password}`,
                {
                    embedOwner: interaction.author.id,
                    embedSource: __tempEmbed
                }
            );
            return password;
        };

    },
};
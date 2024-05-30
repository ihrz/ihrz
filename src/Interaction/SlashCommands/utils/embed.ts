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
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
    ColorResolvable,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    StringSelectMenuInteraction,
    CacheType,
    ApplicationCommandType,
    ChannelSelectMenuBuilder,
    ChannelType,
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    Message,
} from 'discord.js';

import { Command } from '../../../../types/command';
import { generatePassword } from '../../../core/functions/random.js';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'embed',
    description: 'Create a beautiful embed!',
    description_localizations: {
        "fr": "Créez un magnifique embed",
    },
    options: [
        {
            name: 'id',
            type: ApplicationCommandOptionType.String,
            description: 'If you have an embed\'s ID!',
            description_localizations: {
                "fr": "Si vous disposez d\'un identifiant d\'un embed précèdement enregistrer",
            },
            required: false,
        },
    ],
    thinking: false,
    category: 'utils',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        let arg = interaction.options.getString("id");
        let potentialEmbed = await client.db.get(`EMBED.${arg}`);

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.punishpub_not_admin });
            return;
        };

        let __tempEmbed = new EmbedBuilder().setDescription('** **');
        if (potentialEmbed) {
            __tempEmbed = new EmbedBuilder(potentialEmbed.embedSource);
        }

        let select = new StringSelectMenuBuilder()
            .setCustomId('embed-select-menu')
            .setPlaceholder(data.embed_placeholder_string_select_menu_builder)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_copy_embed).setEmoji("📥").setValue('0'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_title).setEmoji("🖊").setValue('1'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_delete_title).setEmoji("💥").setValue('2'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_description).setEmoji("💬").setValue('3'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_delete_description).setEmoji("📝").setValue('4'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_author).setEmoji("🕵️").setValue('5'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_delete_author).setEmoji("✂").setValue('6'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_footer).setEmoji("🔻").setValue('7'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_delete_footer).setEmoji("🔺").setValue('8'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_thumbnail).setEmoji("🔳").setValue('9'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_image).setEmoji("🖼️").setValue('10'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_titleurl).setEmoji("🌐").setValue('11'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_edit_color).setEmoji("🎨").setValue('12'),
                new StringSelectMenuOptionBuilder().setLabel(data.embed_placeholder_option_delete_color).setEmoji("🔵").setValue('13')
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
            fetchReply: true
        });

        let collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 1_420_000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: data.embed_interaction_not_for_you, ephemeral: true });
                return;
            }
            await chooseAction(i);
        });

        collector.on('end', async () => {
            await response.edit({ components: [] });
        });

        type LanguageDataKeys = keyof LanguageData;

        async function chooseAction(i: StringSelectMenuInteraction<CacheType>) {
            switch (i.values[0]) {
                case '0':
                    await handleCollector(i, 'embed_choose_0', (message) => {
                        __tempEmbed.setDescription(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '1':
                    await handleCollector(i, 'embed_choose_1', (message) => {
                        __tempEmbed.setTitle(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '2':
                    __tempEmbed.setTitle('** **');
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: data.embed_choose_2 });
                    break;
                case '3':
                    await handleCollector(i, 'embed_choose_3', (message) => {
                        __tempEmbed.setDescription(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '4':
                    __tempEmbed.setDescription('** **');
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: data.embed_choose_4 });
                    break;
                case '5':
                    await handleCollector(i, 'embed_choose_5', (message) => {
                        __tempEmbed.setAuthor({ name: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '6':
                    __tempEmbed.setAuthor({ name: "      " });
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: data.embed_choose_6 });
                    break;
                case '7':
                    await handleCollector(i, 'embed_choose_7', (message) => {
                        __tempEmbed.setFooter({ text: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '8':
                    __tempEmbed.setFooter({ text: "** **" });
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: data.embed_choose_8 });
                    break;
                case '9':
                    await handleCollector(i, 'embed_choose_9', (message) => {
                        if (!isValidLink(message.content)) {
                            __tempEmbed.setThumbnail("https://exemple.com/exemple/png");
                        } else {
                            __tempEmbed.setThumbnail(message.content);
                        }
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '10':
                    await handleCollector(i, 'embed_choose_10', (message) => {
                        if (!isValidLink(message.content)) {
                            __tempEmbed.setImage("https://exemple.com/exemple/png");
                        } else {
                            __tempEmbed.setImage(message.content);
                        }
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '11':
                    await handleCollector(i, 'embed_choose_11', (message) => {
                        if (isValidLink(message.content)) {
                            __tempEmbed.setURL(message.content);
                            response.edit({ embeds: [__tempEmbed] });
                        }
                    });
                    break;
                case '12':
                    await handleCollector(i, 'embed_choose_12', async (message) => {
                        if (isValidColor(message.content)) {
                            __tempEmbed.setColor(message.content as ColorResolvable);
                            response.edit({ embeds: [__tempEmbed] });
                        } else {
                            await interaction.channel?.send({ content: data.embed_choose_12_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo) });
                        }
                    });
                    break;
                case '13':
                    __tempEmbed.setColor("#000000");
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: data.embed_choose_13 });
                    break;
                default:
                    break;
            }
        }

        async function handleCollector(i: StringSelectMenuInteraction<CacheType>, replyContent: LanguageDataKeys, onCollect: (message: Message) => void) {
            const replyMessage = Array.isArray(data[replyContent]) ? (data[replyContent] as string[]).join(' ') : data[replyContent];
            let reply = await i.reply({ content: replyMessage.toString() });
            let messageCollector = interaction.channel?.createMessageCollector({ filter: (m) => m.author.id === interaction.user.id, max: 1, time: 120_000 });
            messageCollector?.on('collect', async (message) => {
                onCollect(message);
                await reply.delete();
                await message.delete();
            });
        }


        async function sendEmbed(confirmation: ButtonInteraction<CacheType>) {
            const channelSelectMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('embed-save-channel')
                        .setChannelTypes(ChannelType.GuildText)
                        .setMaxValues(1)
                        .setMinValues(1)
                );

            await confirmation.update({
                content: data.embed_send_message.replace('${interaction.user.id}', interaction.user.id),
                components: [channelSelectMenu]
            });

            let seCollector = interaction.channel?.createMessageComponentCollector({
                filter: (m) => m.user.id === interaction.user.id && m.customId === 'embed-save-channel',
                max: 1,
                time: 120_000,
                componentType: ComponentType.ChannelSelect
            });

            seCollector?.on('collect', async (result) => {
                if (result instanceof ChannelSelectMenuInteraction) {
                    let channel = interaction.guild?.channels.cache.get(result.channels.first()?.id!);
                    if (!channel) return;

                    await (channel as BaseGuildTextChannel).send({ embeds: [__tempEmbed] });
                    seCollector.stop();
                    await response.edit({
                        content: data.embed_send_embed_work.replace('${interaction.user.id}', interaction.user.id).replace('${message.content}', channel.id),
                        embeds: [],
                        components: []
                    });
                }
            });

            seCollector?.on('end', async () => {
                await response.edit({ components: [] });
            });
        }

        async function saveEmbed() {
            let password = generatePassword({ length: 16 });

            await client.db.set(`EMBED.${password}`, {
                embedOwner: interaction.user.id,
                embedSource: __tempEmbed.toJSON()
            });

            return password;
        }

        const buttonCollector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000
        });

        buttonCollector.on('collect', async (confirmation) => {
            if (confirmation.user.id !== interaction.user.id) {
                await confirmation.reply({ content: data.embed_interaction_not_for_you, ephemeral: true });
                return;
            }

            switch (confirmation.customId) {
                case "save":
                    if (arg) await client.db.delete(`EMBED.${arg}`);
                    let embedId = await saveEmbed();
                    await confirmation.update({
                        content: data.embed_save_message.replace('${interaction.user.id}', interaction.user.id).replace('${await saveEmbed()}', embedId),
                        components: [],
                        embeds: []
                    });
                    buttonCollector.stop();
                    break;
                case "cancel":
                    await confirmation.update({
                        content: data.embed_cancel_message.replace('${interaction.user.id}', interaction.user.id),
                        components: [],
                        embeds: []
                    });
                    buttonCollector.stop();
                    break;
                case "send":
                    await sendEmbed(confirmation);
                    break;
            }
        });

        buttonCollector.on('end', async () => {
            await response.edit({ components: [] });
        });

        function isValidLink(url: string): boolean {
            return ["https://", "http://"].some(protocol => url.startsWith(protocol));
        }

        function isValidColor(color: string): boolean {
            return /^#([0-9a-f]{3}){1,2}$/i.test(color);
        }
    },
};
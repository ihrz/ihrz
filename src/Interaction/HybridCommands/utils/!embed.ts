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
    TextChannel,
} from 'discord.js';

import { generatePassword } from '../../../core/functions/random.js';
import { LanguageData } from '../../../../types/languageData.js';

import { Command } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var arg = interaction.options.getString("id");
        } else {

            var arg = client.func.method.string(args!, 0);
        };

        let potentialEmbed = await client.db.get(`EMBED.${arg}`) as DatabaseStructure.DbEmbedObject["EMBED"];
        let files: { attachment: string; name: string; }[] = [];


        let __tempEmbed = new EmbedBuilder().setDescription('** **');
        if (potentialEmbed) {
            __tempEmbed = new EmbedBuilder(potentialEmbed.embedSource);
        }

        let select = new StringSelectMenuBuilder()
            .setCustomId('embed-select-menu')
            .setPlaceholder(lang.embed_placeholder_string_select_menu_builder)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_copy_embed).setEmoji("📥").setValue('0'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_title).setEmoji("🖊").setValue('1'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_delete_title).setEmoji("💥").setValue('2'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_description).setEmoji("💬").setValue('3'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_delete_description).setEmoji("📝").setValue('4'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_author).setEmoji("🕵️").setValue('5'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_delete_author).setEmoji("✂").setValue('6'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_footer).setEmoji("🔻").setValue('7'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_delete_footer).setEmoji("🔺").setValue('8'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_thumbnail).setEmoji("🔳").setValue('9'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_image).setEmoji("🖼️").setValue('10'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_titleurl).setEmoji("🌐").setValue('11'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_edit_color).setEmoji("🎨").setValue('12'),
                new StringSelectMenuOptionBuilder().setLabel(lang.embed_placeholder_option_delete_color).setEmoji("🔵").setValue('13')
            );

        let save = new ButtonBuilder()
            .setCustomId('save')
            .setLabel(lang.embed_btn_save)
            .setStyle(ButtonStyle.Success);

        let send = new ButtonBuilder()
            .setCustomId('send')
            .setLabel(lang.embed_btn_send)
            .setStyle(ButtonStyle.Primary);

        let cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel(lang.embed_btn_cancel)
            .setStyle(ButtonStyle.Danger);

        let replace = new ButtonBuilder()
            .setCustomId('replace')
            .setLabel(lang.embed_btn_replace)
            .setStyle(ButtonStyle.Secondary);

        let response = await client.func.method.interactionSend(interaction, {
            content: lang.embed_first_message,
            embeds: [__tempEmbed],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                new ActionRowBuilder<ButtonBuilder>().addComponents(save, send, replace, cancel)
            ],
        });

        let collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 1_420_000
        });

        collector.on('collect', async (i: StringSelectMenuInteraction<"cached">) => {
            if (i.user.id !== interaction.member?.user.id!) {
                await i.reply({ content: lang.embed_interaction_not_for_you, ephemeral: true });
                return;
            }
            await chooseAction(i);
        });

        collector.on('end', async () => {
            await response.edit({ components: [] });
        });

        type LanguageDataKeys = keyof LanguageData;

        async function chooseAction(i: StringSelectMenuInteraction<"cached">) {
            switch (i.values[0]) {
                case '0':
                    await handleCollector(i, 'embed_choose_0', async (message) => {
                        try {
                            const parts = extractDiscordUrlParts(message.content || 'none');

                            if (parts.userIdOrGuildId !== interaction.guildId) {
                                i.followUp({ content: lang.embed_copy_bad_guild_msg.replace("${interaction.guild?.name}", interaction.guild?.name!), ephemeral: true })
                                return;
                            }

                            const channel: TextChannel | null = interaction.guild?.channels.cache.get(parts.channelId) as TextChannel;

                            if (!channel) {
                                i.followUp({ content: lang.embed_copy_bad_channel_msg, ephemeral: true })
                                return;
                            };

                            const targetMessage = await channel?.messages.fetch(parts.messageId);

                            if (!targetMessage) {
                                i.followUp({ content: lang.embed_copy_bad_message_msg, ephemeral: true })
                                return;
                            };

                            const targetMessageEmbedsSize = targetMessage.embeds.length;

                            if (targetMessageEmbedsSize === 0) {
                                i.followUp({ content: lang.embed_copy_bad_embed_message_msg, ephemeral: true })
                                return;
                            };

                            const newEmbed = targetMessage.embeds[0];

                            __tempEmbed = EmbedBuilder.from(newEmbed);

                            response.edit({ embeds: [__tempEmbed] });
                        } catch (err) {
                            i.followUp({
                                content: lang.embed_copy_bad_url_msg
                                    .replace("${message.guildId}", message.guildId!)
                                    .replace("${interaction.channelId}", interaction.channelId!)
                                    .replace("${interaction.id}", interaction.id!),
                                ephemeral: true
                            });
                            return;
                        }
                    });
                    break;
                case '1':
                    await handleCollector(i, 'embed_choose_1', (message) => {
                        __tempEmbed.setTitle(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '2':
                    __tempEmbed.setTitle(null);
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: lang.embed_choose_2, ephemeral: true });
                    break;
                case '3':
                    await handleCollector(i, 'embed_choose_3', (message) => {
                        __tempEmbed.setDescription(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '4':
                    __tempEmbed.setDescription("** **");
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: lang.embed_choose_4, ephemeral: true });
                    break;
                case '5':
                    await handleCollector(i, 'embed_choose_5', (message) => {
                        __tempEmbed.setAuthor({ name: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '6':
                    __tempEmbed.setAuthor(null);
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: lang.embed_choose_6, ephemeral: true });
                    break;
                case '7':
                    await handleCollector(i, 'embed_choose_7', (message) => {
                        __tempEmbed.setFooter({ text: message.content });
                        response.edit({ embeds: [__tempEmbed] });
                    });
                    break;
                case '8':
                    __tempEmbed.setFooter(null);
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: lang.embed_choose_8, ephemeral: true });
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
                        files.splice(0, files.length); //clear the embed for next changes

                        if (isValidLink(message.content)) {
                            __tempEmbed.setImage(message.content);
                        } else if (message.attachments.first()?.contentType?.startsWith("image/")) {
                            let name = "image.png";

                            if (client.func.method.isAnimated(message.attachments.first()?.url!)) {
                                name = "image.gif"
                            }

                            __tempEmbed.setImage("attachment://" + name);

                            files.push(
                                {
                                    attachment: message.attachments.first()?.url!,
                                    name
                                }
                            )
                        };

                        response.edit({
                            embeds: [__tempEmbed], files
                        });
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
                            await client.func.method.channelSend(interaction, { content: lang.embed_choose_12_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo) });
                        }
                    });
                    break;
                case '13':
                    __tempEmbed.setColor(null);
                    response.edit({ embeds: [__tempEmbed] });
                    await i.reply({ content: lang.embed_choose_13, ephemeral: true });
                    break;
                default:
                    break;
            }
        }

        async function handleCollector(i: StringSelectMenuInteraction<"cached">, replyContent: LanguageDataKeys, onCollect: (message: Message) => void) {
            const replyMessage = Array.isArray(lang[replyContent]) ? (lang[replyContent] as string[]).join(' ') : lang[replyContent];
            let reply = await i.reply({ content: replyMessage.toString(), ephemeral: true });
            let messageCollector = (interaction.channel as BaseGuildTextChannel)?.createMessageCollector({ filter: (m) => m.author.id === interaction.member?.user.id!, max: 1, time: 300_000 });
            messageCollector?.on('collect', async (message) => {
                onCollect(message);
                await reply.delete();
                await message.delete();
            });
        }


        async function replaceEmbed(confirmation: ButtonInteraction<"cached">) {
            await confirmation.update({
                content: lang.embed_replace_question_msg,
                components: [],
                files
            });

            let response2 = await (interaction.channel as BaseGuildTextChannel)?.awaitMessages({
                filter: (m) => m.author.id === interaction.member?.user.id!,
                max: 1,
                time: 300_000,
            });

            try {
                const parts = extractDiscordUrlParts(response2.first()?.content || 'none');

                (response2.first())?.delete().catch(() => { });

                if (parts.userIdOrGuildId !== interaction.guildId) {
                    await confirmation.followUp({
                        content: lang.embed_copy_bad_guild_msg.replace("${interaction.guild?.name}", interaction.guild?.name!),
                        ephemeral: true
                    });

                    await response.edit({
                        content: lang.embed_first_message,
                        embeds: [__tempEmbed],
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                            new ActionRowBuilder<ButtonBuilder>().addComponents(save, send, replace, cancel)
                        ],
                        files
                    });
                    return;
                }

                const channel: TextChannel | null = interaction.guild?.channels.cache.get(parts.channelId) as TextChannel;

                if (!channel) {
                    await confirmation.followUp({ content: lang.embed_copy_bad_channel_msg, ephemeral: true });

                    await response.edit({
                        content: lang.embed_first_message,
                        embeds: [__tempEmbed],
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                            new ActionRowBuilder<ButtonBuilder>().addComponents(save, send, replace, cancel)
                        ],
                        files
                    });
                    return;
                }

                const targetMessage = await channel?.messages.fetch(parts.messageId);

                if (!targetMessage) {
                    await confirmation.followUp({ content: lang.embed_copy_bad_message_msg, ephemeral: true });

                    await response.edit({
                        content: lang.embed_first_message,
                        embeds: [__tempEmbed],
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                            new ActionRowBuilder<ButtonBuilder>().addComponents(save, send, replace, cancel)
                        ],
                        files
                    });
                    return;
                }

                const targetMessageEmbedsSize = targetMessage.embeds.length;

                if (targetMessageEmbedsSize === 0) {
                    await confirmation.followUp({ content: lang.embed_copy_bad_embed_message_msg, ephemeral: true });

                    await response.edit({
                        content: lang.embed_first_message,
                        embeds: [__tempEmbed],
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                            new ActionRowBuilder<ButtonBuilder>().addComponents(save, send, replace, cancel)
                        ],
                        files
                    });
                    return;
                }

                targetMessage.edit({ embeds: [__tempEmbed], files });
                await confirmation.editReply({
                    content: lang.embed_replace_message.replace('{user}', interaction.member?.user.toString()!)
                        .replace('{messageUrl}', response2.first()?.content!),
                    files: [],
                    embeds: [],
                    components: []
                });
            } catch (error) {
                (response2.first())?.delete().catch(() => { });

                await confirmation.followUp({
                    content: lang.embed_copy_bad_url_msg
                        .replace("${message.guildId}", interaction.guildId!)
                        .replace("${interaction.channelId}", interaction.channelId!)
                        .replace("${interaction.id}", interaction.id!),
                    ephemeral: true
                });

                await response.edit({
                    content: lang.embed_first_message,
                    embeds: [__tempEmbed],
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
                        new ActionRowBuilder<ButtonBuilder>().addComponents(save, send, replace, cancel)
                    ],
                    files
                });
            }
        }

        async function sendEmbed(confirmation: ButtonInteraction<"cached">) {
            const channelSelectMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('embed-save-channel')
                        .setChannelTypes(ChannelType.GuildText)
                        .setMaxValues(1)
                        .setMinValues(1)
                );

            await confirmation.update({
                content: lang.embed_send_message.replace('${interaction.user.id}', interaction.member?.user.id!),
                components: [channelSelectMenu],
                files: files
            });

            let seCollector = (interaction.channel as BaseGuildTextChannel)?.createMessageComponentCollector({
                filter: (m) => m.user.id === interaction.member?.user.id! && m.customId === 'embed-save-channel',
                max: 1,
                time: 300_000,
                componentType: ComponentType.ChannelSelect
            });

            seCollector?.on('collect', async (result) => {
                if (result instanceof ChannelSelectMenuInteraction) {
                    let channel = interaction.guild?.channels.cache.get(result.channels.first()?.id!);
                    if (!channel) return;

                    await (channel as BaseGuildTextChannel).send({ embeds: [__tempEmbed], files });
                    seCollector.stop();
                    await response.edit({
                        content: lang.embed_send_embed_work.replace('${interaction.user.id}', interaction.member?.user.id!).replace('${message.content}', channel.id),
                        embeds: [],
                        components: [],
                        files: []
                    });
                }
            });

            seCollector?.on('end', async () => {
                await response.edit({ components: [] });
            });
        }

        async function saveEmbed() {
            var password = "";
            if (potentialEmbed?.embedOwner !== interaction.member?.user.id!
                || !arg
            ) {
                password = generatePassword({ length: 16 });
                await client.db.set(`EMBED.${password}`, {
                    embedOwner: interaction.member?.user.id!,
                    embedSource: __tempEmbed.toJSON()
                });
                return password;
            }

            await client.db.set(`EMBED.${arg}`, {
                embedOwner: interaction.member?.user.id!,
                embedSource: __tempEmbed.toJSON()
            });
            return arg;
        }

        const buttonCollector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300_000
        });

        buttonCollector.on('collect', async (confirmation: ButtonInteraction<"cached">) => {
            if (confirmation.user.id !== interaction.member?.user.id!) {
                await confirmation.reply({ content: lang.embed_interaction_not_for_you, ephemeral: true });
                return;
            }

            switch (confirmation.customId) {
                case "save":
                    let embedId = await saveEmbed();
                    await confirmation.update({
                        content: lang.embed_save_message.replace('${interaction.user.id}', interaction.member?.user.id!).replace('${await saveEmbed()}', embedId),
                        components: [],
                        embeds: [],
                        files: []
                    });
                    buttonCollector.stop();
                    break;
                case "cancel":
                    await confirmation.update({
                        content: lang.embed_cancel_message.replace('${interaction.user.id}', interaction.member?.user.id!),
                        components: [],
                        embeds: [],
                        files: []
                    });
                    buttonCollector.stop();
                    break;
                case "send":
                    await sendEmbed(confirmation);
                    break;
                case "replace":
                    await replaceEmbed(confirmation);
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

        function extractDiscordUrlParts(url: string): { userIdOrGuildId: string, channelId: string, messageId: string } {
            try {
                const urlObj = new URL(url);
                const pathSegments = urlObj.pathname.split('/').filter(segment => segment !== '');

                if (pathSegments.length < 4 || pathSegments[0] !== 'channels') {
                    throw new Error('URL Discord non valide');
                }

                const userIdOrGuildId = pathSegments[1];
                const channelId = pathSegments[2];
                const messageId = pathSegments[3];

                return {
                    userIdOrGuildId,
                    channelId,
                    messageId
                };
            } catch (err) {
                throw new Error('URL Discord non valide');
            }
        }
    },
};
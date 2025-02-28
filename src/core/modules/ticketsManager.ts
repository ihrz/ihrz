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
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType,
    PermissionsBitField,
    UserSelectMenuBuilder,
    ChatInputCommandInteraction,
    CacheType,
    ButtonInteraction,
    TextBasedChannel,
    BaseGuildTextChannel,
    User,
    Interaction,
    UserSelectMenuInteraction,
    Role,
    StringSelectMenuInteraction,
    ComponentType,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ModalSubmitInteraction,
    APIEmbed,
} from 'discord.js';

import { isDiscordEmoji, isSingleEmoji } from '../functions/emojiChecker.js';
import { iHorizonModalResolve } from '../functions/modalHelper.js';
import * as discordTranscripts from 'discord-html-transcripts';
import { getDatabaseInstance } from '../database.js';
import logger from '../logger.js';
import { TicketPanel } from '../../Interaction/SlashCommands/ticket/!panel.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import getLanguageData from '../functions/getLanguageData.js';

const database = getDatabaseInstance();

interface CreatePanelData {
    name: string | null;
    description: string | null;
    author: string;
    category?: string | undefined
}

async function CreateButtonPanel(interaction: ChatInputCommandInteraction<"cached">, data: CreatePanelData) {

    let lang = await interaction.client.func.getLanguageData(interaction.guildId);

    let panel = new EmbedBuilder()
        .setTitle(data.name)
        .setColor("#3b8f41")
        .setDescription(data.description || lang.sethereticket_description_embed)
        .setFooter(await interaction.client.method.bot.footerBuilder(interaction))

    let confirm = new ButtonBuilder()
        .setCustomId('open-new-ticket')
        .setEmoji('📩')
        .setLabel(lang.event_ticket_button_name)
        .setStyle(ButtonStyle.Secondary);

    interaction.client.method.channelSend(interaction, {
        embeds: [panel],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirm)],
        files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)]
    }).then(async (message) => {

        await database.set(`${message.guildId}.GUILD.TICKET.${message.id}`,
            {
                author: data.author,
                used: true,
                panelName: data.name,
                reason: false,
                channel: message.channel.id,
                messageID: message.id,
                categoryId: data.category
            }
        );
    });

    try {
        let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
        TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
        if (!TicketLogsChannel) return;

        let embed = new EmbedBuilder()
            .setColor("#008000")
            .setTitle(lang.event_ticket_logsChannel_onCreation_embed_title)
            .setDescription(lang.event_ticket_logsChannel_onCreation_embed_desc
                .replace('${data.name}', data.name!)
                .replace('${interaction}', interaction.channel?.toString()!)
            )
            .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
            .setTimestamp();

        TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
        return;
    } catch (e) { return };
};

export interface CaseList {
    id: number;

    emojis: string | undefined;
    name: string;

    categoryId?: string;
}

async function CreateSelectPanel(interaction: ChatInputCommandInteraction<"cached">, data: CreatePanelData) {
    let lang = await interaction.client.func.getLanguageData(interaction.guildId);
    let case_list: CaseList[] = [];

    let panel_for_create = new EmbedBuilder()
        .setColor(2829617)
        .setDescription(lang.sethereticket_panelforcreate_embed_desc)
        .setFooter(await interaction.client.method.bot.footerBuilder(interaction));

    let button = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("add_selection")
                .setLabel(lang.sethereticket_panelforcreate_button_add_label)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("remove_selection")
                .setLabel(lang.sethereticket_panelforcreate_button_sub_label)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("save_selection")
                .setLabel(lang.sethereticket_panelforcreate_button_save_label)
                .setStyle(ButtonStyle.Success),
        );

    let comp = new StringSelectMenuBuilder()
        .setCustomId("ticket-open-selection")
        .setPlaceholder(data.name!);

    let og_interaction = await interaction.editReply({
        embeds: [panel_for_create],
        components: [button],
        content: null,
        files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)]
    });

    let collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 2_240_000
    });

    let collector2wish = og_interaction.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: async (i) => {
            await i.deferUpdate(); return interaction.user.id === i.user.id;
        },
        time: 2_240_000
    });
    collector2wish?.on('end', () => { });

    collector?.on('collect', async i => {
        if (i.customId === "remove_selection") {
            await i.deferUpdate();
            if (case_list.length > 0) {
                case_list.pop();
                comp.options.pop();
                await og_interaction.edit({
                    components: case_list.length === 0 ? [og_interaction.components[0]] : [og_interaction.components[0], new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(comp)]
                });
            }
        } else if (i.customId === 'add_selection') {
            let response = await iHorizonModalResolve({
                customId: 'selection_modal',
                title: lang.sethereticket_modal_1_title,
                deferUpdate: true,
                fields: [
                    {
                        customId: 'case_name',
                        placeHolder: lang.sethereticket_modal_1_fields_1_placeholder,
                        label: lang.sethereticket_modal_1_fields_1_label,
                        style: TextInputStyle.Short,
                        required: true,
                        maxLength: 150,
                        minLength: 2
                    },
                    {
                        customId: 'case_emoji',
                        placeHolder: lang.sethereticket_modal_1_fields_2_placeholder,
                        label: lang.sethereticket_modal_1_fields_2_label,
                        style: TextInputStyle.Short,
                        required: false,
                        minLength: 1,
                        maxLength: 50
                    }
                ]
            }, i);

            if (!response) return;
            let name = response?.fields.getTextInputValue("case_name")!;
            let emoji = response?.fields.getTextInputValue("case_emoji")!;

            let optionBuilder = new StringSelectMenuOptionBuilder()
                .setLabel(name)
                .setValue((comp.options.length + 1).toString());

            if (emoji !== '') {
                if (isSingleEmoji(emoji) || isDiscordEmoji(emoji)) {
                    optionBuilder.setEmoji(emoji);
                }
            }

            comp.addOptions(optionBuilder);

            case_list.push({
                id: comp.options.length,
                name: name,
                emojis: emoji === '' ? undefined : emoji
            });

            await og_interaction.edit({
                components: [
                    og_interaction.components[0],
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(comp)
                ]
            });
        } else if (i.customId === "save_selection") {
            let response = await iHorizonModalResolve({
                customId: 'embed_saved_modal',
                title: lang.sethereticket_modal_2_title,
                deferUpdate: true,
                fields: [
                    {
                        customId: 'embed_title',
                        placeHolder: lang.sethereticket_modal_2_fields_1_placeholder,
                        label: lang.sethereticket_modal_2_fields_1_title,
                        style: TextInputStyle.Short,
                        required: true,
                        maxLength: 24,
                        minLength: 2
                    },
                    {
                        customId: 'embed_desc',
                        placeHolder: lang.sethereticket_modal_2_fields_2_title,
                        label: lang.sethereticket_modal_2_fields_2_placeholder,
                        style: TextInputStyle.Short,
                        required: false,
                        minLength: 12,
                        maxLength: 500
                    }
                ]
            }, i);

            if (!response) return;

            let title = response?.fields.getTextInputValue("embed_title")!;
            let desc = response?.fields.getTextInputValue("embed_desc")!;

            if (desc === '') {
                desc = lang.sethereticket_description_embed.replace("${user.username}", interaction.user.username);
            }

            button.components.forEach(x => {
                x.setDisabled(true);
            })
            await og_interaction.edit({ components: [button, new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(comp)] });

            for (let x in case_list) {
                let _ = await sendCategorySelection(response!, case_list[x]);
                case_list[x].categoryId = _;
            }

            let reason = await reasonTicket(response!);
            let panel_message = await interaction.client.method.channelSend(og_interaction, {
                content: undefined,
                files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)],
                embeds: [
                    new EmbedBuilder()
                        .setColor(2829617)
                        .setDescription(`## ${title}\n${desc}`)
                        .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                ],
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(comp)
                ]
            });

            await og_interaction.edit({
                components: [],
                embeds: [],
                files: [],
                content: lang.sethereticket_command_work
            });

            await database.set(`${i.guildId}.GUILD.TICKET.${panel_message.id}`, {
                author: data.author,
                used: true,
                reason: reason,
                selection: case_list,
                panelName: data.name,
                channel: panel_message.channel.id,
                messageID: panel_message.id,
            });

            collector?.stop();

            try {
                let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
                TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
                if (!TicketLogsChannel) return;

                let embed = new EmbedBuilder()
                    .setColor("#008000")
                    .setTitle(lang.event_ticket_logsChannel_onCreation_embed_title)
                    .setDescription(lang.event_ticket_logsChannel_onCreation_embed_desc.replace('${data.name}', data.name!).replace('${interaction}', `${interaction.channel}`))
                    .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                    .setTimestamp();

                TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
                return;
            } catch (e) { return };
        }
    });

    async function sendCategorySelection(interaction: ModalSubmitInteraction<"cached">, x: CaseList): Promise<string | undefined> {
        const action_row_category = new ActionRowBuilder<ChannelSelectMenuBuilder>()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setMaxValues(1)
                    .setMinValues(1)
                    .setCustomId('ticket-sethere-category-for-type')
                    .setChannelTypes(ChannelType.GuildCategory)
            );

        const i_category = await interaction.client.method.channelSend(interaction.message!, {
            content: lang.event_ticket_category_awaiting_response
                .replace('${x.emojis ?? interaction.client.iHorizon_Emojis.icon.iHorizon_Pointer}', x.emojis ?? interaction.client.iHorizon_Emojis.icon.iHorizon_Pointer)
                .replace('${x.name}', x.name),
            components: [action_row_category]
        });

        const response = await i_category?.awaitMessageComponent({
            componentType: ComponentType.ChannelSelect,
            time: 30399999
        });

        if (response) {
            response.deferUpdate();
            i_category?.delete();

            return response.channels.first()?.id;
        }
    }

    async function reasonTicket(interaction: ModalSubmitInteraction<"cached">): Promise<boolean | undefined> {
        const action_row_category = new StringSelectMenuBuilder()
            .setCustomId('ticket-sethere-reason')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(lang.mybot_submit_utils_msg_yes)
                    .setValue('yes'),
                new StringSelectMenuOptionBuilder()
                    .setLabel(lang.mybot_submit_utils_msg_no)
                    .setValue('no')
            )

        const i_category = await interaction.client.method.channelSend(interaction.message!, {
            content: lang.event_ticket_reason_awaiting_response.replace('${interaction.user.toString()}', interaction.user.toString()),
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(action_row_category)]
        });

        const response = await i_category?.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 30399999
        });

        if (response) {
            response.deferUpdate();
            i_category?.delete();

            if (response.values[0] === 'yes') {
                return true;
            } else {
                return false;
            }
        }
    }
}

async function CreateTicketChannel(interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">) {

    if (interaction instanceof ButtonInteraction) {
        let result = await database.get(`${interaction.guildId}.GUILD.TICKET.${interaction.message.id}`);
        let userTickets = await database.get(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`) as DatabaseStructure.TicketUserData | null;

        if (!result || result.channel !== interaction.message.channelId
            || result.messageID !== interaction.message.id) return;

        let channelId = userTickets && Object.values(userTickets)[0]?.channel;
        let channel = channelId ? interaction.guild?.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null) : null;

        if (userTickets && !channel) {
            await database.delete(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`);
            userTickets = null;
        }

        if (userTickets) {
            await interaction.reply({
                ephemeral: true,
                content: (await getLanguageData(interaction.guildId)).event_ticket_already_opened
                    .replace('${channelId}', channelId!)
            });
            return;
        } else {
            await CreateChannel(
                interaction,
                result,
            );
            return;
        };
    } else {
        let result = await database.get(`${interaction.guildId}.GUILD.TICKET.${interaction.message.id}`);
        let userTickets = await database.get(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`) as DatabaseStructure.TicketUserData | null;

        if (!result || result.channel !== interaction.message.channelId
            || result.messageID !== interaction.message.id) return;

        let channelId = userTickets && Object.values(userTickets)[0]?.channel;
        let channel = channelId ? interaction.guild?.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null) : null;

        if (userTickets && !channel) {
            await database.delete(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`);
            userTickets = null;
        }

        if (userTickets) {
            await interaction.reply({
                ephemeral: true,
                content: (await getLanguageData(interaction.guildId)).event_ticket_already_opened
                    .replace('${channelId}', channelId!)
            });
            return;
        } else {
            await CreateChannel(
                interaction,
                result,
            );
            return;
        };
    }
};

type ModalResultArray = { questonPlaceholder: string | undefined; questionValue: string; }[];

async function CreateTicketChannelV2(interaction: StringSelectMenuInteraction<"cached">) {
    let panelCode = await interaction.client.db.get(
        `${interaction.guildId}.GUILD.TICKET_PANEL.${interaction.message.id}`
    ) as string | null;
    let result = await interaction.client.db.get(`${interaction.guildId}.GUILD.TICKET_PANEL.${panelCode}`) as TicketPanel;
    let userTickets = await interaction.client.db.get(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`) as DatabaseStructure.TicketUserData | null;
    
    let channelId = userTickets && Object.values(userTickets)[0]?.channel;
    let channel = channelId ? interaction.guild?.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null) : null;

    if (userTickets && !channel) {
        await database.delete(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`);
        userTickets = null;
    }

    if (userTickets) {
        await interaction.reply({
            ephemeral: true,
            content: (await getLanguageData(interaction.guildId)).event_ticket_already_opened
                .replace('${channelId}', channelId!)
        });
        return;
    } else {
        await CreateChannelV2(interaction, result);
    };
}

interface ResultButton {
    panelName: string;
    reason?: boolean;
    categoryId?: string;
    selection?: {
        id: number;
        name: string;
        emojis: string;
        categoryId?: string;
    }[];
};

async function CreateChannel(interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">, result: ResultButton) {
    let lang = await interaction.client.func.getLanguageData(interaction.guildId);
    let category = await database.get(`${interaction.message.guildId}.GUILD.TICKET.category`);

    if (result.categoryId) category = result.categoryId

    let reason = '';
    let reasonInteraction: ModalSubmitInteraction<"cached">;

    if (result && result?.reason) {
        let response = await iHorizonModalResolve({
            customId: 'ticket_reason_modal',
            title: lang.event_ticket_create_reason_modal_title,
            deferUpdate: false,
            fields: [
                {
                    customId: 'ticket_reason',
                    label: lang.event_ticket_create_reason_modal_fields_1_label,
                    style: TextInputStyle.Short,
                    required: true,
                    maxLength: 350,
                    minLength: 8
                },
            ]
        }, interaction);

        if (!response) return;
        try {
            reason = response?.fields.getTextInputValue("ticket_reason")!;
            reasonInteraction = response;
        } catch (error) {
            return;
        }
    } else {
        await interaction.deferReply({ ephemeral: true });
    };

    await interaction.guild?.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: interaction.guild.channels.cache.get(interaction instanceof StringSelectMenuInteraction ? (result.selection?.find(item => item.id === parseInt(interaction.values[0]))?.categoryId ?? category) : category)?.id || null
    }).then(async (channel) => {
        if (category) {
            channel.lockPermissions();
        };

        await channel.permissionOverwrites.edit(interaction.guild?.roles.everyone as Role,
            {
                ViewChannel: false,
                SendMessages: false,
                ReadMessageHistory: false
            }
        );

        await channel.permissionOverwrites.edit(interaction.user.id,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                UseApplicationCommands: true,
                SendVoiceMessages: true,
                EmbedLinks: true
            }
        );

        if (interaction instanceof ButtonInteraction) {
            await interaction.editReply({
                content: lang.event_ticket_whenCreated_msg
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${channel.id}', channel.id)
            });
        } else {
            if (reasonInteraction) {
                await reasonInteraction.reply({
                    content: lang.event_ticket_whenCreated_msg
                        .replace('${interaction.user}', interaction.user.toString())
                        .replace('${channel.id}', channel.id),
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: lang.event_ticket_whenCreated_msg
                        .replace('${interaction.user}', interaction.user.toString())
                        .replace('${channel.id}', channel.id)
                });
            }
        }

        let embeds: EmbedBuilder[] = []

        if (interaction instanceof StringSelectMenuInteraction) {

            embeds.push(
                new EmbedBuilder()
                    .setColor(2829617)
                    .setDescription(
                        lang.sethereticket_panel_select_embed_desc
                            .replace('${result.panelName}', result.panelName)
                            .replace('{msg}', lang.event_ticket_embed_description.replace("${user.username}", interaction.user.username))
                            .replace('{category}', result.selection?.find(item => item.id === parseInt(interaction.values[0]))?.name!)
                    )
                    .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
            );

            if (result.reason && result.reason) {
                embeds.push(
                    new EmbedBuilder()
                        .setColor(2829617)
                        .setDescription(lang.event_ticket_reason_embed_desc.replace('${reason}', reason))
                        .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                );
            }
        } else {
            embeds.push(
                new EmbedBuilder()
                    .setColor("#3b8f41")
                    .setDescription(lang.event_ticket_embed_description
                        .replace("${user.username}", interaction.user.username)
                    )
                    .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
            )
        };

        await database.set(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}.${channel.id}`,
            {
                channel: channel.id,
                author: interaction.user.id,
                alive: true
            }
        );

        let delete_ticket_button = new ButtonBuilder()
            .setCustomId('t-embed-delete-ticket')
            .setEmoji('🗑️')
            .setLabel(lang.ticket_module_button_delete)
            .setStyle(ButtonStyle.Danger);

        let transcript_ticket_button = new ButtonBuilder()
            .setCustomId('t-embed-transcript-ticket')
            .setEmoji('📜')
            .setLabel(lang.ticket_module_button_transcript)
            .setStyle(ButtonStyle.Primary);

        let selectUsersMenu = new UserSelectMenuBuilder()
            .setCustomId('t-embed-select-user')
            .setPlaceholder(`${lang.ticket_module_button_addmember} / ${lang.ticket_module_button_removemember}`)
            .setMinValues(0)
            .setMaxValues(10);

        (channel as BaseGuildTextChannel).send({
            embeds: embeds,
            content: interaction.user.toString(),
            components: [
                new ActionRowBuilder<UserSelectMenuBuilder>()
                    .addComponents(selectUsersMenu)
                , new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(transcript_ticket_button)
                    .addComponents(delete_ticket_button)
            ],
            files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)]
        }).then(async (msg) => {
            await msg.pin("Ticket Panel").catch(() => { })
        }).catch((err: any) => {
            logger.err(err)
        });

        try {
            let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
            if (!TicketLogsChannel) return;

            let embed = new EmbedBuilder()
                .setColor("#008000")
                .setTitle(lang.event_ticket_logsChannel_onCreationChannel_embed_title)
                .setDescription(lang.event_ticket_logsChannel_onCreationChannel_embed_desc
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${channel.id}', channel.id)
                )
                .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                .setTimestamp();

            TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
            return;
        } catch (e) { return };
    }).catch(() => { });
};

async function CreateChannelV2(interaction: StringSelectMenuInteraction<"cached">, result: TicketPanel) {
    let lang = await interaction.client.func.getLanguageData(interaction.guildId);

    let values: ModalResultArray = [];
    let reasonInteraction: ModalSubmitInteraction<"cached">;

    let category =
        result.config.optionFields.find(item => item.value === interaction.values[0])?.categoryId
        || result.category;

    if (result.config.form.length >= 1) {
        let modalFields = result.config.form.map((field) => {
            return {
                customId: field.questionId.toString(),
                label: field.questionTitle.substring(0, 45),
                style: TextInputStyle.Short,
                required: true,
                placeHolder: field.questionPlaceholder?.substring(0, 60),
                maxLength: 240,
                minLength: 1
            }
        });

        let modal = await iHorizonModalResolve({
            customId: 'ticket_reason_modal',
            title: lang.event_ticket_create_reason_modal_fields_1_label,
            deferUpdate: false,
            fields: modalFields
        }, interaction);

        if (!modal) return;
        reasonInteraction = modal;

        // get the values from the modal
        values = modal.fields.fields.map((field) => {
            return {
                questonPlaceholder: modalFields.find((x) => x.customId === field.customId)?.label,
                questionValue: modal.fields.getTextInputValue(field.customId)
            }
        });
    }

    await interaction.guild?.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: interaction.guild.channels.cache.get(category || "")?.id || null
    }).then(async (channel) => {
        if (category) {
            channel.lockPermissions();
        };

        await channel.permissionOverwrites.edit(interaction.guild?.roles.everyone as Role,
            {
                ViewChannel: false,
                SendMessages: false,
                ReadMessageHistory: false
            }
        );

        await channel.permissionOverwrites.edit(interaction.user.id,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                UseApplicationCommands: true,
                SendVoiceMessages: true,
                EmbedLinks: true
            }
        );

        if (reasonInteraction) {
            await reasonInteraction.reply({
                content: lang.event_ticket_whenCreated_msg
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${channel.id}', channel.id),
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: lang.event_ticket_whenCreated_msg
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${channel.id}', channel.id),
                ephemeral: true
            });
        }

        let embeds: EmbedBuilder[] = []

        // get categoryName from the values of the select menu
        // find the category name from the values of the select menu
        let categoryName = result.config.optionFields?.find(item => item.value === interaction.values[0]);

        let og_embed = new EmbedBuilder()
            .setColor(2829617)
            .setDescription(
                lang.sethereticket_panel_select_embed_desc
                    .replace('${result.panelName}', result.placeholder)
                    .replace('{msg}', lang.event_ticket_embed_description.replace("${user.username}", interaction.user.username))
                    .replace('{category}', categoryName?.name!)
            )
            .setFooter(await interaction.client.method.bot.footerBuilder(interaction));

        if (result.ticketChannelPanel) {
            let embed_from_db = (await interaction.client.db.get(`EMBED.${result.ticketChannelPanel}.embedSource`) as APIEmbed | null);

            if (embed_from_db) {
                embeds.push(
                    EmbedBuilder.from(embed_from_db)
                );
            } else {
                embeds.push(og_embed);
            }
        } else {
            embeds.push(og_embed);
        }

        if (values.length > 0) {
            let desc = "";
            for (let x in values) {
                desc += `## ${values[x].questonPlaceholder}\n\`${values[x].questionValue}\`\n`
            }
            embeds.push(
                new EmbedBuilder()
                    .setColor(2829617)
                    .setDescription(desc)
                    .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
            );
        }

        await database.set(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}.${channel.id}`,
            {
                channel: channel.id,
                author: interaction.user.id,
                alive: true
            }
        );

        let delete_ticket_button = new ButtonBuilder()
            .setCustomId('t-embed-delete-ticket')
            .setEmoji('🗑️')
            .setLabel(lang.ticket_module_button_delete)
            .setStyle(ButtonStyle.Danger);

        let transcript_ticket_button = new ButtonBuilder()
            .setCustomId('t-embed-transcript-ticket')
            .setEmoji('📜')
            .setLabel(lang.ticket_module_button_transcript)
            .setStyle(ButtonStyle.Primary);

        let selectUsersMenu = new UserSelectMenuBuilder()
            .setCustomId('t-embed-select-user')
            .setPlaceholder(`${lang.ticket_module_button_addmember} / ${lang.ticket_module_button_removemember}`)
            .setMinValues(0)
            .setMaxValues(10);

        let content: string = "";

        if (result.config.pingUser) {
            content = interaction.user.toString();
        };

        if (result.config.rolesToPing) {
            result.config.rolesToPing.forEach((role) => {
                content += `<@&${role}> `
            })
        };

        (channel as BaseGuildTextChannel).send({
            embeds: embeds,
            content: content === "" ? undefined : content,
            components: [
                new ActionRowBuilder<UserSelectMenuBuilder>()
                    .addComponents(selectUsersMenu)
                , new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(transcript_ticket_button)
                    .addComponents(delete_ticket_button)
            ],
            files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)]
        }).then(async (msg) => {
            await msg.pin("Ticket Panel").catch(() => { })
        }).catch((err: any) => {
            logger.err(err)
        });

        try {
            let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
            if (!TicketLogsChannel) return;

            let embed = new EmbedBuilder()
                .setColor("#008000")
                .setTitle(lang.event_ticket_logsChannel_onCreationChannel_embed_title)
                .setDescription(lang.event_ticket_logsChannel_onCreationChannel_embed_desc
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${channel.id}', channel.id)
                )
                .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                .setTimestamp();

            TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
            return;
        } catch (e) { return };
    }).catch((e) => {
        logger.log(e)
    });
};

async function CloseTicket(interaction: ChatInputCommandInteraction<"cached">) {
    let data = await interaction.client.func.getLanguageData(interaction.guildId);

    let fetch = await database.get(
        `${interaction.guildId}.TICKET_ALL`
    );

    for (let user in fetch) {
        for (let channel in fetch[user]) {
            if (channel === interaction.channel?.id) {
                let member = interaction.guild?.members.cache.get(fetch[user][channel]?.author);

                interaction.channel.messages.fetch().then(async (messages) => {

                    //@ts-ignore
                    let attachment = await discordTranscripts.createTranscript(interaction.channel, {
                        limit: -1,
                        filename: `${interaction.guildId}-transcript.html`,
                        footerText: "Exported {number} message{s}",
                        poweredBy: false,
                        hydrate: true
                    });

                    let embed = new EmbedBuilder()
                        .setDescription(data.close_title_sourcebin)
                        .setColor('#0014a8');

                    try {
                        (interaction.channel as BaseGuildTextChannel).permissionOverwrites.create(member?.user as User, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                        interaction.editReply({ content: data.close_command_work_notify_channel, files: [attachment], embeds: [embed] });
                    } catch {
                        await interaction.client.method.channelSend(interaction, data.close_command_error);
                        return;
                    };

                    try {
                        let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
                        TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
                        if (!TicketLogsChannel) return;

                        let embed = new EmbedBuilder()
                            .setColor("#008000")
                            .setTitle(data.event_ticket_logsChannel_onClose_embed_title)
                            .setDescription(data.event_ticket_logsChannel_onClose_embed_desc
                                .replace('${interaction.user}', interaction.user.toString())
                                .replace('${interaction.channel.id}', interaction.channel?.id!)
                            )
                            .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                            .setTimestamp();

                        TicketLogsChannel.send({ embeds: [embed], files: [attachment, await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
                        return;
                    } catch (e) { return };
                });
            }
        }
    }
};

async function TicketTranscript(interaction: ButtonInteraction<"cached">) {
    let data = await interaction.client.func.getLanguageData(interaction.guildId);
    let interactionChannel = interaction.channel;

    if (interactionChannel?.type !== ChannelType.GuildText) return;

    let fetch = await database.get(
        `${interaction.guildId}.TICKET_ALL`
    );

    for (let user in fetch) {
        for (let channel in fetch[user]) {

            if (channel === interaction.channel?.id) {

                //@ts-ignore
                let attachment = await discordTranscripts.createTranscript(interactionChannel as TextBasedChannel, {
                    limit: -1,
                    filename: `${interaction.guildId}-transcript.html`,
                    footerText: "Exported {number} message{s}",
                    poweredBy: false,
                    hydrate: true,
                    saveImages: true,
                    favicon: interaction.client.user.displayAvatarURL({ size: 512, extension: "png" })
                });

                let embed = new EmbedBuilder()
                    .setDescription(data.close_title_sourcebin)
                    .setColor('#0014a8');

                if (interaction.deferred) {
                    await interaction.editReply({ content: data.guildconfig_config_save_check_dm });
                } else {
                    await interaction.reply({ content: data.guildconfig_config_save_check_dm, ephemeral: true });
                };

                await interaction.user.send({ embeds: [embed], content: data.transript_command_work, files: [attachment] })
                    .catch(() => interaction.followUp({ content: data.ticket_transcript_failed_to_send, ephemeral: true }))

                return;
            }
        }
    }
};

async function TicketRemoveMember(interaction: ChatInputCommandInteraction<"cached">) {
    let data = await interaction.client.func.getLanguageData(interaction.guildId);
    let member = interaction.options.getUser("user");

    try {
        (interaction.channel as BaseGuildTextChannel)?.permissionOverwrites.create(member as User, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
        interaction.editReply({ content: data.remove_command_work.replace(/\${member\.tag}/g, member?.username!) });

        try {
            let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
            if (!TicketLogsChannel) return;

            let embed = new EmbedBuilder()
                .setColor("#008000")
                .setTitle(data.event_ticket_logsChannel_onRemoveMember_embed_title)
                .setDescription(data.event_ticket_logsChannel_onRemoveMember_embed_desc
                    .replace('${member}', member?.toString()!)
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${interaction.channel.id}', interaction.channel?.id!)
                )
                .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                .setTimestamp();

            TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
            return;
        } catch (e) { return };

    } catch {
        await interaction.editReply({ content: data.remove_command_error });
        return;
    };
};

async function TicketAddMember(interaction: ChatInputCommandInteraction<"cached">) {
    let data = await interaction.client.func.getLanguageData(interaction.guildId);
    let member = interaction.options.getUser("user");

    if (!member) {
        await interaction.editReply({ content: data.add_command_error });
        return;
    };

    try {
        (interaction.channel as BaseGuildTextChannel).permissionOverwrites.create(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await interaction.editReply({ content: data.add_command_work.replace(/\${member\.tag}/g, member.username) });

        try {
            let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
            if (!TicketLogsChannel) return;

            let embed = new EmbedBuilder()
                .setColor("#008000")
                .setTitle(data.event_ticket_logsChannel_onAddMember_embed_title)
                .setDescription(data.event_ticket_logsChannel_onAddMember_embed_desc
                    .replace('${member}', member.toString())
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${interaction.channel.id}', interaction.channel?.id!)
                )
                .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                .setTimestamp();

            TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
            return;
        } catch (e) { return };

    } catch (e) {
        await interaction.editReply({ content: data.add_command_error });
        return;
    }
};

async function TicketReOpen(interaction: ChatInputCommandInteraction<"cached">) {
    let data = await interaction.client.func.getLanguageData(interaction.guildId);
    let fetch = await database.get(`${interaction.guildId}.TICKET_ALL`);

    for (let user in fetch) {
        for (let channel in fetch[user]) {

            if (channel === interaction.channel?.id) {
                let member = interaction.guild?.members.cache.get(fetch[user][channel]?.author);

                try {
                    (interaction.channel as BaseGuildTextChannel).permissionOverwrites.edit(member?.user.id!, {
                        ViewChannel: true,
                        SendMessages: true,
                        AttachFiles: true,
                        ReadMessageHistory: true,
                    })
                        .then(() => {
                            interaction.editReply({
                                content: data.open_command_work
                                    .replace(/\${interaction\.channel}/g, interaction.channel?.toString()!)
                            });
                            return;
                        });

                    try {
                        let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
                        TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
                        if (!TicketLogsChannel) return;

                        let embed = new EmbedBuilder()
                            .setColor("#008000")
                            .setTitle(data.event_ticket_logsChannel_onReopen_embed_title)
                            .setDescription(data.event_ticket_logsChannel_onReopen_embed_desc
                                .replace('${interaction.user}', interaction.user.toString())
                                .replace('${interaction.channel.id}', interaction.channel.id)
                            )
                            .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                            .setTimestamp();

                        TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
                        return;
                    } catch (e) { return };

                } catch (e: any) {
                    await interaction.editReply({ content: data.open_command_error });
                    return;
                };
            }
        }
    }
};

async function TicketDelete(interaction: Interaction<"cached">) {
    let data = await interaction.client.func.getLanguageData(interaction.guildId);
    let fetch = await database.get(`${interaction.guildId}.TICKET_ALL`);

    for (let user in fetch) {
        for (let channel in fetch[user]) {
            if (channel === interaction.channel?.id) {

                await database.delete(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`);

                try {
                    let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
                    TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);

                    if (TicketLogsChannel) {
                        //@ts-ignore
                        let attachment = await discordTranscripts.createTranscript(interaction.channel as TextBasedChannel, {
                            limit: -1,
                            filename: `${interaction.guildId}-transcript.html`,
                            footerText: "Exported {number} message{s}",
                            poweredBy: false,
                            hydrate: true
                        });

                        let embed = new EmbedBuilder()
                            .setColor("#008000")
                            .setTitle(data.event_ticket_logsChannel_onDelete_embed_title)
                            .setDescription(data.event_ticket_logsChannel_onDelete_embed_desc
                                .replace('${interaction.user}', interaction.user.toString())
                                .replace('${interaction.channel.name}', (interaction.channel as BaseGuildTextChannel)?.name)
                            )
                            .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                            .setTimestamp();
                        interaction.channel.delete();

                        TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction), attachment] });
                    } else {
                        await interaction.channel.delete();
                    }
                    return;
                } catch (e) { return };
            }
        }
    }
};

async function TicketAddMember_2(interaction: UserSelectMenuInteraction<"cached">) {
    let data = await interaction.client.func.getLanguageData(interaction.guildId);;
    let owner_ticket = await database.get(`${interaction.guildId}.TICKET_ALL.${interaction.user.id}.${interaction.channel?.id}`);

    if (!owner_ticket) {
        await interaction.deferUpdate();
        return;
    };

    let membersArray: string[] = [];
    let listmembersArray: string[] = [];

    interaction.members.each(async (i) => {
        membersArray.push(i.user?.id!);
    });

    (interaction.channel as BaseGuildTextChannel).permissionOverwrites.cache
        .filter((i) => i.type === 1).each
        ((i) => { listmembersArray.push(i.id) });

    let addedMembers: string[] = [];
    let removedMembers: string[] = [];

    listmembersArray.forEach(async (overwriteId) => {
        if (!membersArray.includes(overwriteId) && owner_ticket.author !== overwriteId) {
            removedMembers.push(overwriteId);
            await (interaction.channel as BaseGuildTextChannel).permissionOverwrites.delete(overwriteId);
        }
    });

    membersArray.forEach(async (memberId) => {
        if (!listmembersArray.includes(memberId)) {
            (interaction.channel as BaseGuildTextChannel).permissionOverwrites.edit(memberId,
                {
                    ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true
                }
            );
            addedMembers.push(memberId);
        };
    });

    if (addedMembers.length > 0) {
        interaction.client.method.channelSend(interaction, {
            content: data.event_ticket_add_member
                .replace('${interaction.user}', interaction.user.toString())
                .replace("${addedMembers.map((memberId) => `<@${memberId}>`).join(' ')}", addedMembers.map((memberId) => `<@${memberId}>`).join(' '))
                .replace('${interaction.channel}', interaction.channel!.toString())
        });
    };

    if (removedMembers.length > 0) {
        interaction.client.method.channelSend(interaction, {
            content: data.event_ticket_del_member
                .replace('${interaction.user}', interaction.user.toString())
                .replace("${removedMembers.map((memberId) => `<@${memberId}>`).join(' ')}", removedMembers.map((memberId) => `<@${memberId}>`).join(' '))
                .replace('${interaction.channel}', interaction.channel!.toString())
        });
    };
    await interaction.deferUpdate();

    try {
        let TicketLogsChannel = await database.get(`${interaction.guildId}.GUILD.TICKET.logs`);
        TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
        if (!TicketLogsChannel) return;

        let embed = new EmbedBuilder()
            .setColor("#008000")
            .setTitle(data.event_ticket_logsChannel_onAddMember2_embed_title)
            .setDescription(data.event_ticket_logsChannel_onAddMember2_embed_desc
                .replace('${interaction.user}', interaction.user.toString())
                .replace("${removedMembers}", removedMembers.map((memberId) => `<@${memberId}>`).join(' ') || 'None')
                .replace("${addedMembers}", addedMembers.map((memberId) => `<@${memberId}>`).join(' ') || 'None')
                .replace('${interaction.channel}', interaction.channel?.toString()!)

            )
            .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
            .setTimestamp();

        TicketLogsChannel.send({ embeds: [embed], files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
        return;
    } catch (e) { return };
};

export {
    CreateButtonPanel,

    CloseTicket,
    CreateTicketChannel,
    CreateTicketChannelV2,
    CreateSelectPanel,
    TicketTranscript,
    TicketDelete,

    TicketRemoveMember,
    TicketAddMember,
    TicketReOpen,

    TicketAddMember_2,
};
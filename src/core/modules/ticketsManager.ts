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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import * as discordTranscripts from 'discord-html-transcripts';
import db from '../functions/DatabaseModel.js';
import logger from '../logger.js';
import { LanguageData } from '../../../types/languageData.js';

interface CreatePanelData {
    name: string | null;
    description: string | null;
    author: string
}

async function CreatePanel(interaction: ChatInputCommandInteraction<CacheType>, data: CreatePanelData) {

    let lang = await interaction.client.functions.getLanguageData(interaction.guildId);

    let panel = new EmbedBuilder()
        .setTitle(data.name)
        .setColor("#3b8f41")
        .setDescription(data.description || lang.sethereticket_description_embed)
        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })

    let confirm = new ButtonBuilder()
        .setCustomId('open-new-ticket')
        .setEmoji('📩')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Secondary);

    interaction.channel?.send({
        embeds: [panel],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirm)],
        files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
    }).then(async (message) => {

        await db.set(`${message.guild?.id}.GUILD.TICKET.${message.id}`,
            {
                author: data.author,
                used: true,
                panelName: data.name,
                channel: message.channel.id,
                messageID: message.id,
            }
        );
    });

    try {
        let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
        TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
        if (!TicketLogsChannel) return;

        let embed = new EmbedBuilder()
            .setColor("#008000")
            .setTitle(lang.event_ticket_logsChannel_onCreation_embed_title)
            .setDescription(lang.event_ticket_logsChannel_onCreation_embed_desc
                .replace('${data.name}', data.name)
                .replace('${interaction}', interaction.channel)
            )
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setTimestamp();

        TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
        return;
    } catch (e) { return };
};

interface CaseList {
    id: number;

    emojis: string | undefined;
    name: string;
}

async function CreateSelectPanel(interaction: ChatInputCommandInteraction<CacheType>, data: CreatePanelData) {
    let lang = await interaction.client.functions.getLanguageData(interaction.guild?.id) as LanguageData;
    let case_list: CaseList[] = [];

    let panel_for_create = new EmbedBuilder()
        .setColor(2829617)
        .setDescription(lang.sethereticket_panelforcreate_embed_desc)
        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

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
        content: '  ',
        files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
    });

    let collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 240_000
    });

    let modal = new ModalBuilder()
        .setCustomId('selection_modal')
        .setTitle(lang.sethereticket_modal_1_title);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId('case_name')
                    .setPlaceholder(lang.sethereticket_modal_1_fields_1_placeholder)
                    .setLabel(lang.sethereticket_modal_1_fields_1_label)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(24)
                    .setMinLength(2)
            )
    );

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId('case_emoji')
                    .setLabel(lang.sethereticket_modal_1_fields_2_label)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(lang.sethereticket_modal_1_fields_2_placeholder)
                    .setRequired(false)
            )
    );

    let isSingleEmoji = (text: string): boolean => {
        let regex = /^[\p{Emoji}][\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]?$/u;
        return regex.test(text);
    };

    let isDiscordEmoji = (text: string): boolean => {
        let emojiRegex = /:(\w+):(\d+)>/;
        return emojiRegex.test(text);
    };

    var lastModal_0_IdRegisterd = 0;
    var lastModal_1_IdRegisterd = 0;

    collector?.on('collect', async i => {
        // Remove
        if (i.customId === "remove_selection") {
            i.deferUpdate();

            if (case_list.length > 0) {
                case_list.pop();
                comp.options.pop();

                if (case_list.length === 0) {
                    await og_interaction.edit({
                        components: [
                            og_interaction.components[0]
                        ]
                    });
                } else {
                    await og_interaction.edit({
                        components: [
                            og_interaction.components[0],
                            new ActionRowBuilder<StringSelectMenuBuilder>()
                                .addComponents(comp)
                        ]
                    });
                }
            };

            // Add
        } else if (i.customId === 'add_selection') {
            await i.showModal(modal);

            i.awaitModalSubmit({
                filter: (u) => u.user.id === i.user.id,
                time: 70_000
            }).then(async (interaction) => {

                let name = interaction.fields.getTextInputValue("case_name");
                let emoji = interaction.fields.getTextInputValue("case_emoji");

                if (lastModal_0_IdRegisterd === parseInt(interaction.id)) return;
                lastModal_0_IdRegisterd = parseInt(interaction.id);

                interaction.deferUpdate();

                let optionBuilder = new StringSelectMenuOptionBuilder()
                    .setLabel(name)
                    .setValue((comp.options.length + 1).toString());

                if (emoji !== '') {
                    if (isSingleEmoji(emoji) || isDiscordEmoji(emoji)) {
                        optionBuilder.setEmoji(emoji);
                    };
                };

                comp.addOptions(optionBuilder);

                case_list.push({
                    id: comp.options.length,
                    name: name,
                    emojis: emoji === '' ? undefined : emoji
                });

                await og_interaction.edit({
                    components: [
                        og_interaction.components[0],
                        new ActionRowBuilder<StringSelectMenuBuilder>()
                            .addComponents(comp)
                    ]
                });
            });

            // Save
        } else if (i.customId === "save_selection") {

            let modal = new ModalBuilder()
                .setCustomId('embed_saved_modal')
                .setTitle(lang.sethereticket_modal_2_title);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('embed_title')
                            .setPlaceholder(lang.sethereticket_modal_2_fields_1_placeholder)
                            .setLabel(lang.sethereticket_modal_2_fields_1_title)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(24)
                            .setMinLength(2)
                    )
            );

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('embed_desc')
                            .setLabel(lang.sethereticket_modal_2_fields_2_title)
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder(lang.sethereticket_modal_2_fields_2_placeholder)
                            .setRequired(false)
                    )
            );

            i.showModal(modal);

            i.awaitModalSubmit({
                filter: (u) => u.user.id === i.user.id && u.customId === 'embed_saved_modal',
                time: 50_000
            }).then(async (interaction) => {

                if (lastModal_1_IdRegisterd === parseInt(interaction.id)) return;
                lastModal_1_IdRegisterd = parseInt(interaction.id);

                interaction.deferUpdate();

                let title = interaction.fields.getTextInputValue("embed_title");
                let desc = interaction.fields.getTextInputValue("embed_desc");

                if (desc === '') {
                    desc = lang.sethereticket_description_embed
                        .replace("${user.username}", interaction.user.username)
                };

                let panel_message = await og_interaction.channel.send({
                    content: '** **',
                    files: [
                        {
                            attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()),
                            name: 'icon.png'
                        }
                    ],
                    embeds: [
                        new EmbedBuilder()
                            .setColor(2829617)
                            .setDescription(`## ${title}\n${desc}`)
                            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                    ],
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>()
                            .addComponents(comp)
                    ]
                });

                await og_interaction.edit({
                    components: [],
                    embeds: [],
                    files: [],
                    content: lang.sethereticket_command_work
                });

                await db.set(`${i.guild?.id}.GUILD.TICKET.${panel_message.id}`,
                    {
                        author: data.author,
                        used: true,
                        selection: case_list,
                        panelName: data.name,
                        channel: panel_message.channel.id,
                        messageID: panel_message.id,
                    }
                );

                collector?.stop();

                try {
                    let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
                    TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
                    if (!TicketLogsChannel) return;

                    let embed = new EmbedBuilder()
                        .setColor("#008000")
                        .setTitle(lang.event_ticket_logsChannel_onCreation_embed_title)
                        .setDescription(lang.event_ticket_logsChannel_onCreation_embed_desc
                            .replace('${data.name}', data.name!)
                            .replace('${interaction}', `${interaction.channel}`)
                        )
                        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                        .setTimestamp();

                    TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
                    return;
                } catch (e) { return };
            });
        }
    });

};


async function CreateTicketChannel(interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>) {

    if (interaction instanceof ButtonInteraction) {
        let result = await db.get(`${interaction.guild?.id}.GUILD.TICKET.${interaction.message.id}`);
        let userTickets = await db.get(`${interaction.guild?.id}.TICKET_ALL.${interaction.user.id}`);

        if (!result || result.channel !== interaction.message.channelId
            || result.messageID !== interaction.message.id) return;

        if (userTickets) {
            interaction.deferUpdate();
            return;
        } else {
            await CreateChannel(
                interaction,
                result,
            );
            return;
        };
    } else {
        let result = await db.get(`${interaction.guild?.id}.GUILD.TICKET.${interaction.message.id}`);
        let userTickets = await db.get(`${interaction.guild?.id}.TICKET_ALL.${interaction.user.id}`);

        if (!result || result.channel !== interaction.message.channelId
            || result.messageID !== interaction.message.id) return;

        if (userTickets) {
            interaction.deferUpdate();
            return;
        } else {
            interaction.deferUpdate();

            await CreateChannel(
                interaction,
                result,
            );
            return;
        };
    }
};

interface ResultButton {
    panelName: string;
    selection?: {
        id: number;
        name: string;
        emojis: string;
    }[];
};

async function CreateChannel(interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>, result: ResultButton) {
    let lang = await interaction.client.functions.getLanguageData(interaction.guild?.id) as LanguageData;
    let category = await db.get(`${interaction.message.guildId}.GUILD.TICKET.category`);

    await interaction.guild?.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category
    }).then(async (channel) => {

        if (category) {
            channel.lockPermissions();
        };

        if (interaction instanceof ButtonInteraction) {
            interaction.reply({
                content: lang.event_ticket_whenCreated_msg
                    .replace('${interaction.user}', interaction.user as unknown as string)
                    .replace('${channel.id}', channel.id)
                , ephemeral: true
            });
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
                SendVoiceMessages: true
            }
        );

        let welcome = new EmbedBuilder();

        if (interaction instanceof StringSelectMenuInteraction) {

            welcome
                .setColor(2829617)
                .setDescription(
                    lang.sethereticket_panel_select_embed_desc
                        .replace('${result.panelName}', result.panelName)
                        .replace('{msg}', lang.event_ticket_embed_description.replace("${user.username}", interaction.user.username))
                        .replace('{category}', result.selection?.find(item => item.id === parseInt(interaction.values[0]))?.name!)
                )
                .setFooter({
                    text: 'iHorizon',
                    iconURL: "attachment://icon.png"
                })
                ;
        } else {
            welcome
                .setColor("#3b8f41")
                .setDescription(lang.event_ticket_embed_description
                    .replace("${user.username}", interaction.user.username)
                )
                .setFooter({
                    text: 'iHorizon',
                    iconURL: "attachment://icon.png"
                })
                ;
        };

        await db.set(`${interaction.guild?.id}.TICKET_ALL.${interaction.user.id}.${channel.id}`,
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
            embeds: [welcome],
            content: `${interaction.user}`,
            components: [
                new ActionRowBuilder<UserSelectMenuBuilder>()
                    .addComponents(selectUsersMenu)
                , new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(transcript_ticket_button)
                    .addComponents(delete_ticket_button)
            ],
            files: [
                { attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }
            ]
        }).catch((err: any) => {
            logger.err(err)
        });

        try {
            let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
            if (!TicketLogsChannel) return;

            let embed = new EmbedBuilder()
                .setColor("#008000")
                .setTitle(lang.event_ticket_logsChannel_onCreationChannel_embed_title)
                .setDescription(lang.event_ticket_logsChannel_onCreationChannel_embed_desc
                    .replace('${interaction.user}', interaction.user as unknown as string)
                    .replace('${channel.id}', channel.id)
                )
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setTimestamp();

            TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
            return;
        } catch (e) { return };
    }).catch(() => { });
};

async function CloseTicket(interaction: ChatInputCommandInteraction<CacheType>) {
    let data = await interaction.client.functions.getLanguageData(interaction.guild?.id);

    let fetch = await db.get(
        `${interaction.guild?.id}.TICKET_ALL`
    );

    for (let user in fetch) {
        for (let channel in fetch[user]) {
            if (channel === interaction.channel?.id) {
                let member = interaction.guild?.members.cache.get(fetch[user][channel]?.author);

                if (interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) || interaction.user.id === member?.user.id) {
                    interaction.channel.messages.fetch().then(async (messages) => {

                        let attachment = await discordTranscripts.createTranscript(interaction.channel as TextBasedChannel, {
                            limit: -1,
                            filename: 'transcript.html',
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
                        } catch (e: any) {
                            await interaction.channel?.send(data.close_command_error);
                            return;
                        };

                        try {
                            let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
                            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
                            if (!TicketLogsChannel) return;

                            let embed = new EmbedBuilder()
                                .setColor("#008000")
                                .setTitle(data.event_ticket_logsChannel_onClose_embed_title)
                                .setDescription(data.event_ticket_logsChannel_onClose_embed_desc
                                    .replace('${interaction.user}', interaction.user)
                                    .replace('${interaction.channel.id}', interaction.channel?.id)
                                )
                                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                                .setTimestamp();

                            TicketLogsChannel.send({ embeds: [embed], files: [attachment, { attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
                            return;
                        } catch (e) { return };
                    });
                }
            }
        }
    }
};

async function TicketTranscript(interaction: ButtonInteraction<CacheType>) {
    let data = await interaction.client.functions.getLanguageData(interaction.guild?.id);
    let interactionChannel = interaction.channel;

    let fetch = await db.get(
        `${interaction.guild?.id}.TICKET_ALL`
    );

    for (let user in fetch) {
        for (let channel in fetch[user]) {

            if (channel === interaction.channel?.id) {
                let member = interaction.guild?.members.cache.get(fetch[user][channel]?.author);

                if (interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) || interaction.user.id === member?.user.id) {
                    let attachment = await discordTranscripts.createTranscript(interactionChannel as TextBasedChannel, {
                        limit: -1,
                        filename: 'transcript.html',
                        footerText: "Exported {number} message{s}",
                        poweredBy: false,
                        hydrate: true
                    });

                    let embed = new EmbedBuilder()
                        .setDescription(data.close_title_sourcebin)
                        .setColor('#0014a8');

                    if (interaction.deferred) {
                        await interaction.editReply({ embeds: [embed], content: data.transript_command_work, files: [attachment] });
                    } else {
                        await interaction.reply({ embeds: [embed], content: data.transript_command_work, files: [attachment] });
                    };
                    return;
                }
            }
        }
    }
};

async function TicketRemoveMember(interaction: ChatInputCommandInteraction<CacheType>) {
    let data = await interaction.client.functions.getLanguageData(interaction.guild?.id);
    let member = interaction.options.getUser("user");

    try {
        (interaction.channel as BaseGuildTextChannel)?.permissionOverwrites.create(member as User, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
        interaction.editReply({ content: data.remove_command_work.replace(/\${member\.tag}/g, member?.username) });

        try {
            let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
            if (!TicketLogsChannel) return;

            let embed = new EmbedBuilder()
                .setColor("#008000")
                .setTitle(data.event_ticket_logsChannel_onRemoveMember_embed_title)
                .setDescription(data.event_ticket_logsChannel_onRemoveMember_embed_desc
                    .replace('${member}', member)
                    .replace('${interaction.user}', interaction.user)
                    .replace('${interaction.channel.id}', interaction.channel?.id)
                )
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setTimestamp();

            TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
            return;
        } catch (e) { return };

    } catch (e: any) {
        await interaction.editReply({ content: data.remove_command_error });
        return;
    };
};

async function TicketAddMember(interaction: ChatInputCommandInteraction<CacheType>) {
    let data = await interaction.client.functions.getLanguageData(interaction.guild?.id);
    let member = interaction.options.getUser("user");

    if (!member) {
        await interaction.editReply({ content: data.add_incorect_syntax });
        return;
    };

    try {
        (interaction.channel as BaseGuildTextChannel).permissionOverwrites.create(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await interaction.editReply({ content: data.add_command_work.replace(/\${member\.tag}/g, member.username) });

        try {
            let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
            TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
            if (!TicketLogsChannel) return;

            let embed = new EmbedBuilder()
                .setColor("#008000")
                .setTitle(data.event_ticket_logsChannel_onAddMember_embed_title)
                .setDescription(data.event_ticket_logsChannel_onAddMember_embed_desc
                    .replace('${member}', member)
                    .replace('${interaction.user}', interaction.user)
                    .replace('${interaction.channel.id}', interaction.channel?.id)
                )
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setTimestamp();

            TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
            return;
        } catch (e) { return };

    } catch (e) {
        await interaction.editReply({ content: data.add_command_error });
        return;
    }
};

async function TicketReOpen(interaction: ChatInputCommandInteraction<CacheType>) {
    let data = await interaction.client.functions.getLanguageData(interaction.guild?.id);
    let fetch = await db.get(`${interaction.guild?.id}.TICKET_ALL`);

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
                                    .replace(/\${interaction\.channel}/g, interaction.channel)
                            });
                            return;
                        });

                    try {
                        let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
                        TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
                        if (!TicketLogsChannel) return;

                        let embed = new EmbedBuilder()
                            .setColor("#008000")
                            .setTitle(data.event_ticket_logsChannel_onReopen_embed_title)
                            .setDescription(data.event_ticket_logsChannel_onReopen_embed_desc
                                .replace('${interaction.user}', interaction.user)
                                .replace('${interaction.channel.id}', interaction.channel.id)
                            )
                            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                            .setTimestamp();

                        TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
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

async function TicketDelete(interaction: Interaction<CacheType>) {
    let data = await interaction.client.functions.getLanguageData(interaction.guild?.id);
    let fetch = await db.get(`${interaction.guild?.id}.TICKET_ALL`);

    for (let user in fetch) {
        for (let channel in fetch[user]) {

            let member = interaction.guild?.members.cache.get(fetch[user][channel]?.author);

            if (channel === interaction.channel?.id
                &&
                (interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) || interaction.user.id === member?.user.id)) {

                await db.delete(`${interaction.guild?.id}.TICKET_ALL.${interaction.user.id}`);
                interaction.channel.delete();

                try {
                    let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
                    TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
                    if (!TicketLogsChannel) return;

                    let embed = new EmbedBuilder()
                        .setColor("#008000")
                        .setTitle(data.event_ticket_logsChannel_onDelete_embed_title)
                        .setDescription(data.event_ticket_logsChannel_onDelete_embed_desc
                            .replace('${interaction.user}', interaction.user)
                            .replace('${interaction.channel.name}', (interaction.channel as BaseGuildTextChannel)?.name)
                        )
                        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                        .setTimestamp();

                    TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
                    return;
                } catch (e) { return };
            }
        }
    }
};

async function TicketAddMember_2(interaction: UserSelectMenuInteraction<CacheType>) {
    let data = await interaction.client.functions.getLanguageData(interaction.guild?.id);
    let owner_ticket = await db.get(`${interaction.guild?.id}.TICKET_ALL.${interaction.user.id}.${interaction.channel?.id}`);

    if (!owner_ticket) {
        await interaction.deferUpdate();
        return;
    };

    let membersArray: string[] = [];
    let listmembersArray: string[] = [];

    interaction.members.each(async (i) => { membersArray.push(i.user?.id as string) });

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
        interaction.channel?.send({
            content: data.event_ticket_add_member
                .replace('${interaction.user}', interaction.user)
                .replace("${addedMembers.map((memberId) => `<@${memberId}>`).join(' ')}", addedMembers.map((memberId) => `<@${memberId}>`).join(' '))
                .replace('${interaction.channel}', interaction.channel)
        });
    };

    if (removedMembers.length > 0) {
        interaction.channel?.send({
            content: data.event_ticket_del_member
                .replace('${interaction.user}', interaction.user)
                .replace("${removedMembers.map((memberId) => `<@${memberId}>`).join(' ')}", removedMembers.map((memberId) => `<@${memberId}>`).join(' '))
                .replace('${interaction.channel}', interaction.channel)
        });
    };
    await interaction.deferUpdate();

    try {
        let TicketLogsChannel = await interaction.client.db.get(`${interaction.guild?.id}.GUILD.TICKET.logs`);
        TicketLogsChannel = interaction.guild?.channels.cache.get(TicketLogsChannel);
        if (!TicketLogsChannel) return;

        let embed = new EmbedBuilder()
            .setColor("#008000")
            .setTitle(data.event_ticket_logsChannel_onAddMember2_embed_title)
            .setDescription(data.event_ticket_logsChannel_onAddMember2_embed_desc
                .replace('${interaction.user}', interaction.user)
                .replace("${removedMembers}", removedMembers.map((memberId) => `<@${memberId}>`).join(' ') || 'None')
                .replace("${addedMembers}", addedMembers.map((memberId) => `<@${memberId}>`).join(' ') || 'None')
                .replace('${interaction.channel}', interaction.channel)

            )
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setTimestamp();

        TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
        return;
    } catch (e) { return };
};

export {
    CreatePanel,

    CloseTicket,
    CreateTicketChannel,
    CreateSelectPanel,
    TicketTranscript,
    TicketDelete,

    TicketRemoveMember,
    TicketAddMember,
    TicketReOpen,

    TicketAddMember_2,
};
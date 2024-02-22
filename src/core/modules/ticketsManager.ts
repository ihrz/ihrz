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
} from 'discord.js';

import * as discordTranscripts from 'discord-html-transcripts';
import db from '../functions/DatabaseModel.js';
import logger from '../logger.js';

interface CreatePanelData {
    name: string | null;
    description: string | null;
    author: string
}

async function CreatePanel(interaction: ChatInputCommandInteraction<CacheType>, data: CreatePanelData) {

    let lang = await interaction.client.functions.getLanguageData(interaction.guild?.id);

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

async function CreateTicketChannel(interaction: ButtonInteraction<CacheType>) {

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
};

interface Result {
    panelName: string
};

async function CreateChannel(interaction: ButtonInteraction<CacheType>, result: Result) {
    let lang = await interaction.client.functions.getLanguageData(interaction.guild?.id);
    let category = await db.get(`${interaction.message.guildId}.GUILD.TICKET.category`);

    await interaction.guild?.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category
    }).then(async (channel) => {
        interaction.reply({
            content: lang.event_ticket_whenCreated_msg
                .replace('${interaction.user}', interaction.user)
                .replace('${channel.id}', channel.id)
            , ephemeral: true
        });

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
                SendVoiceMessages: true
            }
        );

        let welcome = new EmbedBuilder()
            .setTitle(result.panelName)
            .setColor("#3b8f41")
            .setDescription(lang.event_ticket_embed_description
                .replace("${user.username}", interaction.user.username)
            )
            .setFooter({
                text: 'iHorizon',
                iconURL: "attachment://icon.png"
            });

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
            .setPlaceholder(`${lang.ticket_module_button_addmember}/${lang.ticket_module_button_removemember}`)
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
                    .replace('${interaction.user}', interaction.user)
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
    TicketTranscript,
    TicketDelete,

    TicketRemoveMember,
    TicketAddMember,
    TicketReOpen,

    TicketAddMember_2,
};
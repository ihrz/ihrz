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
    EmbedBuilder,
    time,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    Client,
    BaseGuildTextChannel,
    GuildMessageManager,
    GuildTextBasedChannel,
    Interaction,
    InteractionResponse,
    ChatInputCommandInteraction,
    TextBasedChannel,
    ButtonInteraction,
    CacheType,
    Embed
} from 'discord.js';

import { Giveaway } from '../../types/giveaways';
import date from 'date-and-time';
import db from './functions/DatabaseModel';

async function Create(channel: TextBasedChannel, data: Giveaway) {

    let confirm = new ButtonBuilder()
        .setCustomId('confirm-entry-giveaway')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Primary);

    let gw = new EmbedBuilder()
        .setColor('#9a5af2')
        .setTitle(data.prize)
        .setDescription(`Ends: ${time((date.addMilliseconds(new Date(), data.duration)), 'R')} (${time((date.addMilliseconds(new Date(), data.duration)), 'D')})\nHosted by: ${data.hostedBy}\nEntries: **0**\nWinners: **${data.winnerCount}**`)
        .setTimestamp((date.addMilliseconds(new Date(), data.duration)));

    let response = await channel.send({
        embeds: [gw],
        components: [new ActionRowBuilder<ButtonBuilder>()
            .addComponents(confirm)]
    });

    await db.add("test", "s")
    await db.set(`GIVEAWAYS.${(channel as GuildTextBasedChannel).guildId}.${channel.id}.${response.id}`,
        {
            winnerCount: data.winnerCount,
            prize: data.prize,
            hostedBy: data.hostedBy.id,
            expireIn: date.addMilliseconds(new Date(), data.duration),
            ended: false,
            members: []
        }
    );

    return;
};

async function AddEntries(interaction: ButtonInteraction<CacheType>) {

    let members = await db.get(`GIVEAWAYS.${interaction.guild?.id}.${interaction.channel?.id}.${interaction.message.id}.members`);

    if (members.includes(interaction.user.id)) {
        RemoveEntries(interaction);
        return;
    } else {

        await db.push(`GIVEAWAYS.${interaction.guild?.id}.${interaction.channel?.id}.${interaction.message.id}.members`, interaction.user.id);

        await interaction.deferUpdate();

        let regex = /Entries: \*\*\d+\*\*/;

        let embedsToEdit = EmbedBuilder.from(interaction.message.embeds[0])
            .setDescription(interaction.message.embeds[0]?.description!
                .replace(regex, `Entries: **${members.length + 1}**`)
            );

        await interaction.message.edit({ embeds: [embedsToEdit] });
    };
    return;
};

async function RemoveEntries(interaction: ButtonInteraction<CacheType>) {

    let members: Array<string> = await db.get(`GIVEAWAYS.${interaction.guild?.id}.${interaction.channel?.id}.${interaction.message.id}.members`);
    let lang = await interaction.client.functions.getLanguageData(interaction.guild?.id);

    function arraySub(arr: Array<string>, value: string) {
        return arr.filter(function (toSub) {
            return toSub != value;
        });
    };

    await db.set(`GIVEAWAYS.${interaction.guild?.id}.${interaction.channel?.id}.${interaction.message.id}.members`, arraySub(members, interaction.user.id));

    await interaction.reply({
        content: lang.event_gw_removeentries_msg
            .replace('${interaction.user}', interaction.user)
        , ephemeral: true
    });

    let regex = /Entries: \*\*\d+\*\*/;

    let embedsToEdit = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(interaction.message.embeds[0]?.description!
            .replace(regex, `Entries: **${arraySub(members, interaction.user.id).length}**`)
        );

    await interaction.message.edit({ embeds: [embedsToEdit] });
    return;
};

async function End(client: Client, data: any) {

    let fetch = await db.get(`GIVEAWAYS.${data.guildId}`);

    for (let channelId in fetch) {
        for (let messageId in fetch[channelId]) {

            if (messageId === data.messageId) {

                let ended = await db.get(`GIVEAWAYS.${data.guildId}.${channelId}.${messageId}.ended`);

                if (ended !== true) {
                    await db.set(`GIVEAWAYS.${data.guildId}.${channelId}.${messageId}.ended`, 'End()');

                    Finnish(
                        client,
                        messageId,
                        data.guildId,
                        channelId
                    );
                }
            };

        };
    };
};

function SelectWinners(fetch: any, number: number) {
    if (fetch.members.length === 0) {
        return undefined;
    };

    let areWinnersInPreviousWinners = (currentWinners: string[]) => {
        return currentWinners.some(winner => fetch.winners.includes(winner));
    };

    let winners: Array<string> = [];

    do {
        winners = [];
        let availableMembers = [...fetch.members];

        if (winners.length === 0 || areWinnersInPreviousWinners(winners)) {
            winners = [];
        };

        for (let i = 0; i < number; i++) {
            if (availableMembers.length === 0) {
                break;
            }

            let randomIndex = Math.floor(Math.random() * availableMembers.length);
            let winnerID = availableMembers.splice(randomIndex, 1)[0];
            winners.push(winnerID);
        }
    } while (winners.length === 0);

    return winners.length > 0 ? winners : undefined;
};

async function Finnish(client: Client, messageId: string, guildId: string, channelId: string) {

    let lang = await client.functions.getLanguageData(guildId);
    let fetch = await db.get(`GIVEAWAYS.${guildId}.${channelId}.${messageId}`);

    if (!fetch.ended === true || fetch.ended === 'End()') {
        let guild = await client.guilds.fetch(guildId);
        let channel = await guild.channels.fetch(channelId);

        let message = await (channel as GuildTextBasedChannel).messages.fetch(messageId).catch(async () => {
            await db.delete(`GIVEAWAYS.${guildId}.${channelId}.${messageId}`);
            return;
        })

        let winner = SelectWinners(
            fetch,
            fetch.winnerCount
        );

        let winners = winner ? winner.map((winner: string) => `<@${winner}>`) : 'None';

        let Finnish = new ButtonBuilder()
            .setLabel(lang.event_gw_finnish_button_title)
            .setURL('https://media.tenor.com/uO4u0ib3oK0AAAAC/done-and-done-spongebob.gif')
            .setStyle(ButtonStyle.Link);

        let embeds = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(fetch.prize)
            .setDescription(`Ended: ${time(new Date(fetch.expireIn), 'R')} (${time(new Date(fetch.expireIn), 'D')})\nHosted by: <@${fetch.hostedBy}>\nEntries **${fetch.members.length}**\nWinners: ${winners}`)
            .setTimestamp()

        await message?.edit({
            embeds: [embeds], components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(Finnish)]
        });

        if (winners !== 'None') {
            await message?.reply({
                content: lang.event_gw_finnish_msg
                    .replace('${winners}', winners)
                    .replace('${fetch.prize}', fetch.prize)
            })
        } else {
            await message?.reply({
                content: lang.event_gw_finnish_cannot_msg
            });
        };

        await db.set(`GIVEAWAYS.${guildId}.${channelId}.${messageId}.ended`, true);
        await db.set(`GIVEAWAYS.${guildId}.${channelId}.${messageId}.winner`, winner || 'None');
    };
    return;
};

async function Reroll(client: Client, data: any) {

    let lang = await client.functions.getLanguageData(data.guildId);
    let fetch = await db.get(`GIVEAWAYS.${data.guildId}`);

    for (let channelId in fetch) {
        for (let messageId in fetch[channelId]) {
            if (messageId === data.messageId) {

                let guild = await client.guilds.fetch(data.guildId);
                let channel = await guild.channels.fetch(channelId);

                let message = await (channel as BaseGuildTextChannel).messages.fetch(messageId).catch(async () => {
                    await db.delete(`GIVEAWAYS.${data.guildId}.${channel?.id}.${data.messageId}`);
                    return;
                })

                let winner = SelectWinners(
                    fetch[channelId][messageId],
                    fetch[channelId][messageId].winnerCount
                );

                let winners = winner ? winner.map((winner: string) => `<@${winner}>`) : [];

                let embeds = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle(fetch[channelId][messageId].prize)
                    .setDescription(`Ended: ${time(new Date(fetch[channelId][messageId].expireIn), 'R')} (${time(new Date(fetch[channelId][messageId].expireIn), 'D')})\nHosted by: <@${fetch[channelId][messageId].hostedBy}>\nEntries **${fetch[channelId][messageId].members.length}**\nWinners: ${winners}`)
                    .setTimestamp()

                await message?.edit({
                    embeds: [embeds]
                });

                if (winner && winner[0] !== 'None') {
                    await message?.reply({
                        content: lang.event_gw_reroll_win_msg
                            .replace('${winners}', winners)
                            .replace('${fetch[channelId][messageId].prize}', fetch[channelId][messageId].prize)
                    });
                } else {
                    await message?.reply({
                        content: lang.event_gw_reroll_cannot_win_msg
                    });
                };

                await db.set(`GIVEAWAYS.${data.guildId}.${channelId}.${messageId}.winner`, winner || 'None');
            };
        };
    };

};

function Init(client: Client) {
    Refresh(client);

    setInterval(() => {
        Refresh(client);
    }, 4500);
};


async function isValid(giveawayId: number, data: any) {
    let fetch = await db.get(`GIVEAWAYS.${data.guildId}`);

    let dataDict: any = {};

    for (let channelId in fetch) {
        for (let messageId in fetch[channelId]) {
            dataDict[messageId] = true;
        }
    };

    if (dataDict[giveawayId]) {
        return true;
    };

    return false;
};

async function isEnded(giveawayId: number, data: { guildId: string }) {
    let fetch = await db.get(`GIVEAWAYS.${data.guildId}`);

    let dataDict: any = {};

    for (let channelId in fetch) {
        for (let messageId in fetch[channelId]) {
            dataDict[messageId] = fetch[channelId][messageId].ended;
        }
    };

    if (dataDict[giveawayId]) {
        return true;
    };

    return false;
};

async function Refresh(client: Client) {
    let drop_all_db = await db.get(`GIVEAWAYS`);

    for (let guildId in drop_all_db) {
        // guildId: Server Guild ID
        // b: Giveaway's Message ID
        // drop_all_db[a][b] : Giveaway Object

        for (let channelId in drop_all_db[guildId]) {
            for (let messageId in drop_all_db[guildId][channelId]) {
                let now = new Date().getTime();
                let gwExp = new Date(drop_all_db[guildId][channelId][messageId]?.expireIn).getTime();
                let cooldownTime = now - gwExp;

                if (now >= gwExp) {
                    Finnish(
                        client,
                        messageId,
                        guildId,
                        channelId
                    );
                };

                if (cooldownTime >= 345_600_000) {
                    await db.delete(`GIVEAWAYS.${guildId}.${channelId}.${messageId}`);
                };
            }
        }
    }
};

async function ListEntries(interaction: ChatInputCommandInteraction, data: any) {
    let drop_all_db = await db.get(`GIVEAWAYS`);

    for (let guildId in drop_all_db) {
        // guildId: Server Guild ID
        // b: Giveaway's Message ID
        // drop_all_db[a][b] : Giveaway Object

        for (let channelId in drop_all_db[guildId]) {
            for (let messageId in drop_all_db[guildId][channelId]) {
                if (messageId === data.messageId && guildId === data.guildId) {
                    var char: Array<string> = drop_all_db[guildId][channelId][messageId].members;

                    if (char.length == 0) {
                        await interaction.editReply({ content: "There is no entry into this competition." });
                        return;
                    };

                    let currentPage = 0;
                    let usersPerPage = 10;
                    let pages: { title: string; description: string; }[] = [];

                    for (let i = 0; i < char.length; i += usersPerPage) {
                        let pageUsers = char.slice(i, i + usersPerPage);
                        let pageContent = pageUsers.map((userId) => `<@${userId}>`).join('\n');
                        pages.push({
                            title: `Giveaway's Entries List | Page ${i / usersPerPage + 1}`,
                            description: pageContent,
                        });
                    };

                    let createEmbed = () => {
                        return new EmbedBuilder()
                            .setColor("#800080")
                            .setTitle(pages[currentPage].title)
                            .setDescription(pages[currentPage].description)
                            .setFooter({ text: `iHorizon | Page ${currentPage + 1}/${pages.length}`, iconURL: interaction.client.user?.displayAvatarURL() })
                            .setTimestamp()
                    };

                    let row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('previousPage')
                            .setLabel('⬅️')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('nextPage')
                            .setLabel('➡️')
                            .setStyle(ButtonStyle.Secondary),
                    );

                    let messageEmbed = await interaction.editReply({
                        embeds: [createEmbed()], components: [(row as ActionRowBuilder<ButtonBuilder>)]
                    });

                    let collector = messageEmbed.createMessageComponentCollector({
                        filter: (i) => {
                            i.deferUpdate();
                            return interaction.user.id === i.user.id;
                        }, time: 60000
                    });

                    collector.on('collect', (interaction: { customId: string; }) => {
                        if (interaction.customId === 'previousPage') {
                            currentPage = (currentPage - 1 + pages.length) % pages.length;
                        } else if (interaction.customId === 'nextPage') {
                            currentPage = (currentPage + 1) % pages.length;
                        }

                        messageEmbed.edit({ embeds: [createEmbed()] });
                    });

                    collector.on('end', () => {
                        row.components.forEach((component) => {
                            if (component instanceof ButtonBuilder) {
                                component.setDisabled(true);
                            }
                        });
                        messageEmbed.edit({ components: [(row as ActionRowBuilder<ButtonBuilder>)] });
                    });
                };
            }
        }
    }
}

export {
    Init,
    isValid,
    isEnded,

    Create,
    Reroll,
    End,

    AddEntries,
    RemoveEntries,
    ListEntries
};
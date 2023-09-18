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
    Client
} from 'discord.js';

import { Giveaway } from '../../types/giveaways';
import date from 'date-and-time';
import * as db from './functions/DatabaseModel';

async function Create(channel: any, data: Giveaway) {

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
        components: [new ActionRowBuilder()
            .addComponents(confirm)]
    });

    await db.DataBaseModel({
        id: db.Set,
        key: `GIVEAWAYS.${channel.guild.id}.${channel.id}.${response.id}`,
        value: {
            winnerCount: data.winnerCount,
            prize: data.prize,
            hostedBy: data.hostedBy.id,
            expireIn: date.addMilliseconds(new Date(), data.duration),
            members: []
        }
    });

    return;
};

async function AddEntries(interaction: any) {

    let members = await db.DataBaseModel({
        id: db.Get,
        key: `GIVEAWAYS.${interaction.guild.id}.${interaction.channel.id}.${interaction.message.id}.members`,
    });

    if (members.includes(interaction.user.id)) {
        RemoveEntries(interaction);
        return;
    } else {

        await db.DataBaseModel({
            id: db.Push,
            key: `GIVEAWAYS.${interaction.guild.id}.${interaction.channel.id}.${interaction.message.id}.members`,
            value: interaction.user.id
        });

        await interaction.deferUpdate();

        let regex = /Entries: \*\*\d+\*\*/;

        let embedsToEdit = new EmbedBuilder(interaction.message.embeds[0])
            .setDescription(interaction.message.embeds[0].description
                .replace(regex, `Entries: **${members.length + 1}**`)
            );

        await interaction.message.edit({ embeds: [embedsToEdit] });
    };
    return;
};

async function RemoveEntries(interaction: any) {

    let members: Array<string> = await db.DataBaseModel({
        id: db.Get,
        key: `GIVEAWAYS.${interaction.guild.id}.${interaction.channel.id}.${interaction.message.id}.members`,
    });

    function arraySub(arr: Array<any>, value: string) {
        return arr.filter(function (toSub) {
            return toSub != value;
        });
    };

    await db.DataBaseModel({
        id: db.Set,
        key: `GIVEAWAYS.${interaction.guild.id}.${interaction.channel.id}.${interaction.message.id}.members`,
        value: arraySub(members, interaction.user.id)
    });

    await interaction.reply({ content: `${interaction.user} you have leave this giveaways !`, ephemeral: true });

    let regex = /Entries: \*\*\d+\*\*/;

    let embedsToEdit = new EmbedBuilder(interaction.message.embeds[0])
        .setDescription(interaction.message.embeds[0].description
            .replace(regex, `Entries: **${arraySub(members, interaction.user.id).length}**`)
        );

    await interaction.message.edit({ embeds: [embedsToEdit] });

    return;
};

async function End(interaction: any, data: any) {
    // console.log(data)

    let fetch = await db.DataBaseModel({
        id: db.Get,
        key: `GIVEAWAYS.${data.guildId}`
    });

    for (let channelId in fetch) {
        for (let messageId in fetch[channelId]) {

            if (messageId === data.messageId) {

                let ended = await db.DataBaseModel({
                    id: db.Get,
                    key: `GIVEAWAYS.${data.guildId}.${channelId}.${messageId}.ended`
                });

                if (ended !== true) {
                    await db.DataBaseModel({
                        id: db.Set,
                        key: `GIVEAWAYS.${data.guildId}.${channelId}.${messageId}.ended`,
                        value: 'End()'
                    });

                    Finnish(
                        interaction,
                        messageId,
                        data.guildId,
                        channelId
                    );

                    console.log('do somethings..')
                }
            };

        };
    };
};

async function Finnish(client: Client, messageId: any, guildId: any, channelId: any) {

    let fetch = await db.DataBaseModel({
        id: db.Get,
        key: `GIVEAWAYS.${guildId}.${channelId}.${messageId}`
    });

    if (!fetch.ended === true) {

        let guild = await client.guilds.fetch(guildId);
        let channel = await guild.channels.fetch(channelId);

        let message = await (channel as any).messages.fetch(messageId);
        let winner = fetch.members[(Math.floor(Math.random() * fetch.members.length))];

        if (winner) {
            winner = '<@' + winner + '>';
        } else { winner = 'None' };

        let Finnish = new ButtonBuilder()
            .setLabel('Giveaway Finnished')
            .setURL('https://media.tenor.com/uO4u0ib3oK0AAAAC/done-and-done-spongebob.gif')
            .setStyle(ButtonStyle.Link);

        let embeds = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(fetch.prize)
            .setDescription(`Ended: ${time(new Date(fetch.expireIn), 'R')} (${time(new Date(fetch.expireIn), 'D')})\nHosted by: <@${fetch.hostedBy}>\nEntries **${fetch.members.length}**\nWinners: ${winner}`)
            .setTimestamp()

        await message.edit({
            embeds: [embeds], components: [new ActionRowBuilder()
                .addComponents(Finnish)]
        });

        if (winner !== 'None') {
            await message.reply({ content: `Congratulations ${winner}! You won the **${fetch.prize}**!` })
        } else {
            await message.reply({
                content: 'No valid entrants, so a winner could not be determined!'
            });
        };

        await db.DataBaseModel({
            id: db.Set,
            key: `GIVEAWAYS.${guildId}.${channelId}.${messageId}.ended`,
            value: true
        });

    } else if (fetch?.ended === 'End()') {
        console.log('okay !')
    }
    return;
};

async function Reroll(interaction: any) {

};

function Init(client: any) {
    Refresh(client);

    setInterval(Refresh, 4500);
};


async function isValid(giveawayId: number, data: any) {
    let fetch = await db.DataBaseModel({
        id: db.Get,
        key: `GIVEAWAYS.${data.guildId}`
    });

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

async function Refresh(client: any) {
    let drop_all_db = await db.DataBaseModel({
        id: db.Get,
        key: `GIVEAWAYS`
    });

    for (let guildId in drop_all_db) {
        // guildId: Server Guild ID
        // b: Giveaway's Message ID
        // drop_all_db[a][b] : Giveaway Object
        for (let channelId in drop_all_db[guildId]) {
            for (let messageId in drop_all_db[guildId][channelId]) {
                let now = new Date().getTime();
                let gwExp = new Date(drop_all_db[guildId][channelId][messageId]?.expireIn).getTime();

                if (now >= gwExp) {
                    Finnish(
                        client,
                        messageId,
                        guildId,
                        channelId
                    );
                };
            }
        }
    }
};

export {
    Init,
    isValid,

    Create,
    Reroll,
    End,

    AddEntries,
    RemoveEntries
};
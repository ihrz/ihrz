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
    ActionRowBuilder
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
        key: `GIVEAWAYS.${channel.guild.id}.${response.id}`,
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
        key: `GIVEAWAYS.${interaction.guild.id}.${interaction.message.id}.members`,
    });

    if (members.includes(interaction.user.id)) {
        RemoveEntries(interaction);
        return;
    } else {

        await db.DataBaseModel({
            id: db.Push,
            key: `GIVEAWAYS.${interaction.guild.id}.${interaction.message.id}.members`,
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
        key: `GIVEAWAYS.${interaction.guild.id}.${interaction.message.id}.members`,
    });

    function arraySub(arr: Array<any>, value: string) {
        return arr.filter(function (geeks) {
            return geeks != value;
        });
    };

    await db.DataBaseModel({
        id: db.Set,
        key: `GIVEAWAYS.${interaction.guild.id}.${interaction.message.id}.members`,
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

async function End(interaction: any) {

};

async function Finnish(client: any, data: Giveaway) {
    console.log(client, data)
};

async function Reroll(interaction: any) {

};

function Init(client: any) {
    Refresh(client);
};

async function Refresh(client: any) {
    let drop_all_db = await db.DataBaseModel({
        id: db.Get,
        key: `GIVEAWAYS`
    });

    for (let a in drop_all_db) {
        // a: Server Guild ID
        // b: Giveaway's Message ID
        // drop_all_db[a][b] : Giveaway Object

        for (let b in drop_all_db[a]) {
            let now = new Date().getTime();
            let gwExp = new Date(drop_all_db[a][b]?.expireIn).getTime();

            if (now >= gwExp) {
                Finnish(client, drop_all_db[a][b]);
            };
        }
    }
};

export {
    Create,
    End,
    Reroll,
    AddEntries,
    RemoveEntries,
    Init
};
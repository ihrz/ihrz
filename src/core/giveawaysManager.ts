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

import { Create } from '../../types/giveaways';
import date from 'date-and-time';
import * as db from './functions/DatabaseModel';

async function Create(channel: any, data: Create) {

    let confirm = new ButtonBuilder()
        .setCustomId('confirm-entry-giveaway')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Primary);

    let gw = new EmbedBuilder()
        .setColor('#9a5af2')
        .setTitle(data.prize)
        .setDescription(`Click with 🎉 to participate!!\n__Duration:__ ${time((date.addMilliseconds(new Date(), data.duration)), 'd')}\nHosted by ${data.hostedBy}\n**Entries** __0__`)
        .setFooter({ text: `${data.winnerCount} Winner(s)` })
        .setTimestamp((date.addMilliseconds(new Date(), data.duration)));


    let response = await channel.send({
        content: ':tada::tada: **GIVEAWAY** :tada::tada:',
        embeds: [gw],
        components: [new ActionRowBuilder()
            .addComponents(confirm)]
    });

    await db.DataBaseModel({
        id: db.Set,
        key: `${channel.guild.id}.GIVEAWAYS.${response.id}`,
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
        key: `${interaction.guild.id}.GIVEAWAYS.${interaction.message.id}.members`,
    });

    if (members.includes(interaction.user.id)) {
        RemoveEntries(interaction);
        return;
    } else {

        await db.DataBaseModel({
            id: db.Push,
            key: `${interaction.guild.id}.GIVEAWAYS.${interaction.message.id}.members`,
            value: interaction.user.id
        });

        let giveaway_entries_accepted = new EmbedBuilder()
            .setColor('#9a5af2')
            .setTitle('Giveaway entries accepted !')
            .setDescription(`${interaction.user}, your entries **are accepted** for this giveaway!`)
            .setTimestamp()

        await interaction.reply({ embeds: [giveaway_entries_accepted], ephemeral: true });

        let regex = /\*\*Entries\*\* __\d+__/;

        let embedsToEdit = new EmbedBuilder(interaction.message.embeds[0])
            .setDescription(interaction.message.embeds[0].description
                .replace(regex, `**Entries** __${members.length}__`)
            );

        await interaction.message.edit({ embeds: [embedsToEdit] });
    };
    return;
};

async function RemoveEntries(interaction: any) {
    let embeds = new EmbedBuilder()
        .setColor('#cb2121')
        .setTitle('⚠️ Leaving the giveaways ?')
        .setDescription(`${interaction.user}, are you sure about leave this giveaways ?`);

    await interaction.reply({ embeds: [embeds], ephemeral: true });
};

async function End(interaction: any) {

};

async function Reroll(interaction: any) {

};

export {
    Create,
    End,
    Reroll,
    AddEntries,
    RemoveEntries
};
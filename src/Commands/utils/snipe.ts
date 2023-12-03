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
    Client,
    EmbedBuilder,
} from 'discord.js'

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'snipe',
    description: 'Get the last message deleted in this channel!',
    category: 'utils',
    thinking: false,
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        var based = await client.db.get(`${interaction.guild.id}.GUILD.SNIPE.${interaction.channel.id}`);

        if (!based) {
            await interaction.reply({ content: data.snipe_no_previous_message_deleted });
            return;
        };

        let embed = new EmbedBuilder()
            .setColor("#474749")
            .setAuthor({ name: based.snipeUserInfoTag, iconURL: based.snipeUserInfoPp })
            .setDescription(`\`${based.snipe || 0}\``)
            .setTimestamp(based.snipeTimestamp);

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
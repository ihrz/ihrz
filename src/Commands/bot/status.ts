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
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';
import os from 'os-utils';
import config from '../../files/config';

export const command: Command = {
    name: 'status',
    description: 'Get the bot status! (Only for the bot owner)',
    category: 'bot',
    thinking: false,
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (interaction.user.id != config.owner.ownerid1 && config.owner.ownerid2) {
            await interaction.reply({ content: data.status_be_bot_dev });
            return;
        };

        os.cpuUsage(function (c) {
            let embed = new EmbedBuilder()
                .setColor("#42ff08")
                .addFields(
                    { name: "=====================", value: '**Consumed in real time** :', inline: false },
                    { name: "**CPU USAGE:**", value: 'CPU Usage (%): **' + c + '** %', inline: false },
                    { name: "**RAM USAGE:**", value: 'MEMORY Usage (%): **' + os.freememPercentage() + '** %', inline: false },
                    { name: "=====================", value: '**Characteristic of the server** :', inline: false },
                    { name: "**TOTAL RAM:**", value: 'TOTAL RAM (MB): **' + os.totalmem() + '** MB', inline: false },
                    { name: "**CPU NAME:**", value: '**AMD RYZEN 7 5700G 8 CORE / 12 THREADS 4.6Ghz**', inline: false },
                    { name: "=====================", value: '`iHORIZON`', inline: false }
                )
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })

            interaction.reply({ embeds: [embed] });
            return;
        })
    },
};
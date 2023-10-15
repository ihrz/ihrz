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
    PermissionsBitField,
    TextChannel
} from 'discord.js';

import { execSync } from 'child_process';
import config from '../../files/config';
import date from 'date-and-time';
import ms from 'ms';
import logger from '../../core/logger';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let channel = interaction.options.getChannel('to');
        let fetch = await client.db.get(`${interaction.guild.id}.PFPS.disable`);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: ":x: You don't have Administrator Permissions to execute this command" });
            return;
        };

        if (!fetch && (channel instanceof TextChannel)) {
            client.db.set(`${interaction.guild.id}.PFPS.channel`, channel.id);

            let embed = new EmbedBuilder()
                .setColor('#333333')
                .setTitle('Pfps Module set Here!')
                .setDescription(`${interaction.user} have set the PFPS module here!\nNow every 15seconds, iHorizon sent a avatar of random user in this guild!\n I will try to do my best!`)
                .setTimestamp()

            await interaction.editReply({ content: `${interaction.user}, you have set succeffuly the PFPS module to the channel ${channel} !` });

            channel.send({ embeds: [embed] });
            return;

        } else {
            logger.log('mmmh?');
        };
    },
};
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
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import axios from 'axios';

export const command: Command = {
    name: 'kiss',
    description: 'Kiss a user!',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to kiss',
            required: true
        }
    ],
    category: 'fun',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        const kiss = interaction.options.getUser("user");

        var kissGif = [
            'https://cdn.discordapp.com/attachments/600751265781252149/613486150002278630/tenor-4.gif',
            'https://cdn.discordapp.com/attachments/600751265781252149/613486548561952788/tenor-5.gif',
            'https://cdn.discordapp.com/attachments/717813904046293063/717818490601603072/kiss1.gif',
            'https://cdn.discordapp.com/attachments/717813904046293063/717818780910223410/kiss2.gif'

        ];

        const embed = new EmbedBuilder()
            .setColor("#ff0884")
            .setDescription(data.kiss_embed_description
                .replace(/\${kiss\.id}/g, kiss.id)
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            )
            .setImage(kissGif[Math.floor(Math.random() * kissGif.length)])
            .setTimestamp()

        return interaction.reply({ embeds: [embed] });
    },
};
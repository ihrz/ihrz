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
    name: 'question',
    description: 'Ask a question to the bot !',
    options: [
        {
            name: 'question',
            type: ApplicationCommandOptionType.String,
            description: 'The question you want to give for the bot',
            required: true
        }
    ],
    category: 'fun',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        let question = interaction.options.getString("question");

        let text = question.split(" ");

        if (!text[2]) return interaction.reply({ content: data.question_not_full });

        let reponse = data.question_s
        let result = Math.floor((Math.random() * reponse.length));

        const embed = new EmbedBuilder()
            .setTitle(data.question_embed_title
                .replace(/\${interaction\.user\.username}/g, interaction.user.username)
            )
            .setColor("#ddd98b")
            .addFields({ name: data.question_fields_input_embed, value: question, inline: true },
                { name: data.question_fields_output_embed, value: reponse[result] })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] })
    },
};
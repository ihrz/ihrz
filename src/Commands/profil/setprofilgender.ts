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
import ms from 'ms';
import config from '../../files/config';

export const command: Command = {
    name: 'setprofilgender',
    description: 'Set your gender on the iHorizon Profil!',
    options: [
        {
            name: 'gender',
            type: ApplicationCommandOptionType.String,
            description: "Please make your choice.",
            required: true,
            choices: [
                {
                    name: "♀ Female",
                    value: "♀️ Female"
                },
                {
                    name: "♂ Male",
                    value: "♂️ Male"
                },
                {
                    name: "🚻 Other",
                    value: "⚧️ Other"
                }
            ]
        }
    ],
    category: 'profil',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        var gender = interaction.options.getString("gender");

        await db.DataBaseModel({ id: db.Set, key: `GLOBAL.USER_PROFIL.${interaction.user.id}.gender`, value: gender })
        return interaction.reply({ content: data.setprofildescriptions_command_work });
    },
};
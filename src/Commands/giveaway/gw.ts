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
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import {Command} from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms from 'ms';

export const command: Command = {
    name: "gw",
    description: "Subcommand for giveaway category!",
    options: [
        {
            name: "start",
            description: "Start a giveaway!",
            type: 1,
            options: [
                {
                    name: 'channel',
                    type: ApplicationCommandOptionType.Channel,
                    description: 'The channels where the giveaways is sent',
                    required: true
                },
                {
                    name: 'winner',
                    type: ApplicationCommandOptionType.Number,
                    description: 'Number of winner for the giveaways',
                    required: true
                },
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,
                    description: 'The time duration of the giveaways',
                    required: true
                },
                {
                    name: 'prize',
                    type: ApplicationCommandOptionType.String,
                    description: 'The giveaway\'s prize',
                    required: true
                }
            ]
        },
        {
            name: "end",
            description: "Stop a giveaway!",
            type: 1,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,
                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    required: true
                }
            ],
        },
        {
            name: "reroll",
            description: "Reroll a giveaway winner(s)!",
            type: 1,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,
                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    required: true
                }
            ],
        }
    ],
    category: 'giveaway',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'start') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'end') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'reroll') {
            await require('./!' + command).run(client, interaction, data);
        }
        ;
    },
}
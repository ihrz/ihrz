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
    name: "economy",
    description: "Subcommand for economy category!",
    options: [
        {
            name: "manage",
            description: "Remove / Add money to a user!",
            type: 2,
            options: [
                {
                    name: 'add',
                    description: 'Add money to a user!',
                    type: 1,
                    options: [
                        {
                            name: 'amount',
                            type: ApplicationCommandOptionType.Number,
                            description: 'The amount of money you want to add',
                            required: true
                        },
                        {
                            name: 'member',
                            type: ApplicationCommandOptionType.User,
                            description: 'The member who you want to add money',
                            required: true
                        }
                    ],
                },
                {
                    name: 'remove',
                    description: 'Remove money from a user!',
                    type: 1,
                    options: [
                        {
                            name: 'amount',
                            type: ApplicationCommandOptionType.Number,
                            description: 'amount of $ you want add',
                            required: true
                        },
                        {
                            name: 'member',
                            type: ApplicationCommandOptionType.User,
                            description: 'the member you want to add the money',
                            required: true
                        }
                    ],
                },
            ],
        },
        {
            name: 'wallet',
            description: 'Get the balance of a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'Target a user for see their current balance or keep blank for yourself',
                    required: false
                }
            ],
        },
        {
            name: 'reward',
            description: 'Claim a reward!',
            type: 2,
            options: [
                {
                    name: 'daily',
                    description: 'Claim a daily reward!',
                    type: 1
                },
                {
                    name: 'monthly',
                    description: 'Claim a monthly reward!',
                    type: 1
                },
                {
                    name: 'weekly',
                    description: 'Claim a weekly reward!',
                    type: 1
                }
            ],
        },
        {
            name: 'pay',
            description: 'Pay a user a certain amount!',
            type: 1,
            options: [
                {
                    name: 'amount',
                    type: ApplicationCommandOptionType.Number,
                    description: 'The amount of money you want to donate to them',
                    required: true
                },
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'The member you want to donate the money',
                    required: true
                }
            ],
        },
        {
            name: 'rob',
            description: 'Rob a user!',
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to rob a money',
                    required: true
                }
            ],
        },
        {
            name: 'work',
            description: 'Claim a work reward!',
            type: 1
        },
    ],
    category: 'economy',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'add') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'wallet') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'daily') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'monthly') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'pay') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'remove') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'rob') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'weekly') {
            await require('./!' + command).run(client, interaction, data);
        } else if (command === 'work') {
            await require('./!' + command).run(client, interaction, data);
        }
        ;
    },
}
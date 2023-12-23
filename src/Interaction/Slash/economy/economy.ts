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
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType,
} from 'discord.js';

import { Command } from '../../../../types/command';

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
            name: 'balance',
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
            name: 'leaderboard',
            description: "Get the users balance's leaderboard of the guild!",
            type: 1,
        },
        {
            name: 'deposit',
            description: 'Deposit coin in your bank!',
            type: 1,
            options: [
                {
                    name: 'how-much',
                    type: ApplicationCommandOptionType.Number,
                    description: 'How much coin you want to deposit in your bank?',
                    required: true
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
            name: 'withdraw',
            description: 'Withdraw coin from your bank!',
            type: 1,
            options: [
                {
                    name: 'how-much',
                    type: ApplicationCommandOptionType.Number,
                    description: 'How much coin you want to withdraw from your bank?',
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
    thinking: false,
    category: 'economy',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
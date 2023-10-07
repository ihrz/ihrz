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
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: "fun",
    description: "Subcommand for fun category!",
    options: [
        {
            name: 'caracteres',
            description: 'Transform a string into a DarkSasuke!',
            type: 1,
            options: [
                {
                    name: 'nickname',
                    type: ApplicationCommandOptionType.String,
                    description: 'your cool nickname to transform !',
                    required: true
                }
            ],
        },
        {
            name: 'cats',
            description: 'Get a picture of cat!',
            type: 1,
        },
        {
            name: 'dogs',
            description: 'Get a picture of dog!',
            type: 1,
        },
        {
            name: 'hack',
            description: 'Hack a user!',
            type: 1,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to hack",
                    required: true
                }
            ],
        },
        {
            name: 'hug',
            description: 'Hug a user!',
            type: 1,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to hug",
                    required: true
                }
            ],
        },
        {
            name: 'kiss',
            description: 'Kiss a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to kiss',
                    required: true
                }
            ],
        },
        {
            name: 'love',
            description: 'Show your love compatibilty with the user!',
            type: 1,
            options: [
                {
                    name: "user1",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to know you love's compatibilty",
                    required: false
                },
                {
                    name: "user2",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to know you love's compatibilty",
                    required: false
                }
            ],
        },
        {
            name: 'morse',
            description: 'Transform a string into a Morse!',
            type: 1,
            options: [
                {
                    name: 'input',
                    type: ApplicationCommandOptionType.String,
                    description: 'Enter your input to encrypt/decrypt in morse',
                    required: true
                }
            ],
        },
        {
            name: 'poll',
            description: 'Create a poll!',
            type: 1,
            options: [
                {
                    name: 'message',
                    type: ApplicationCommandOptionType.String,
                    description: 'The message showed on the poll',
                    required: true
                }
            ],
        },
        {
            name: 'question',
            description: 'Ask a question to the bot !',
            type: 1,
            options: [
                {
                    name: 'question',
                    type: ApplicationCommandOptionType.String,
                    description: 'The question you want to give for the bot',
                    required: true
                }
            ],
        },
        {
            name: 'slap',
            description: 'Slap a user!',
            type: 1,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to slap",
                    required: true
                }
            ],
        },
        {
            name: 'youtube',
            description: 'Permit to send custom youtube comment (real) !',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: "The user",
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'comment',
                    description: "The comment",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
            ],
        },
        {
            name: 'tweet',
            description: 'Permit to send custom tweet !',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: "The user",
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'comment',
                    description: "The comment",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
            ]
        },
        {
            name: 'transgender',
            description: 'all humans have rights',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: "the user",
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
            ],
        },
        {
            name: 'catsay',
            description: 'Cat say (insert text here)',
            type: 1,
            options: [
                {
                    name: 'text',
                    description: "The cat say...",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
            ],
        }
    ],
    category: 'fun',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
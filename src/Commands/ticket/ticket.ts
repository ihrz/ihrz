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
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: "ticket",
    description: "Subcommand for ticket category!",
    options: [
        {
            name: "add",
            description: "Add a member into your ticket!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to add into your ticket',
                    required: true
                }
            ],
        },
        {
            name: "close",
            description: "Close a ticket!",
            type: 1,
        },
        {
            name: "delete",
            description: "Delete a iHorizon ticket!",
            type: 1,
        },
        {
            name: "disable",
            description: "Disable ticket commands on a guild!",
            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'What you want to do?',
                    required: true,
                    choices: [
                        {
                            name: "Remove the module",
                            value: "off"
                        },
                        {
                            name: 'Power on the module',
                            value: "on"
                        },
                    ],
                },
            ],
        },
        {
            name: 'log-channel',
            description: "Set a channel where iHorizon sent a logs about tickets!",
            type: 1,
            options: [
                {
                    name: 'channel',
                    type: ApplicationCommandOptionType.Channel,
                    description: 'Where you want the logs',
                    required: true
                }
            ],
        },
        {
            name: "open",
            description: "re-open a closed ticket!",
            type: 1,
        },
        {
            name: 'remove',
            description: "Remove a member from your ticket!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to remove into your ticket',
                    required: true
                }
            ],
        },
        {
            name: "set-here",
            description: "Make a embed for allowing to user to create a ticket!",
            type: 1,
            options: [
                {
                    name: "name",
                    description: "The name of you ticket's panel.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "description",
                    description: "The description of you ticket's panel.",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                }
            ],
        },
        {
            name: "set-category",
            description: "Set the category where ticket are been create!",
            type: 1,
            options: [
                {
                    name: "category-name",
                    description: "The name of you ticket's panel.",
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                }
            ],
        },
        {
            name: "transcript",
            description: "Get the transript of a ticket message!",
            type: 1,
        },
    ],
    thinking: true,
    category: 'ticket',
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
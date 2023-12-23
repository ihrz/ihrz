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
    name: "authorization",
    description: "Subcommand for protection category!",
    options: [
        {
            name: "actions",
            description: "Choose an actions to Deny/Allow for the user!",
            type: 1,
            options: [
                {
                    name: 'rule',
                    type: ApplicationCommandOptionType.String,
                    description: 'Whats is the rule to configure?',
                    required: true,
                    choices: [
                        {
                            name: "Delete All Settings",
                            value: "cls"
                        },
                        {
                            name: "Create Webhook",
                            value: "webhook"
                        },
                        {
                            name: "Create Channel",
                            value: "createchannel",
                        },
                        {
                            name: "Delete Channel",
                            value: "deletechannel",
                        },
                        {
                            name: "Create Role",
                            value: "createrole",
                        },
                        {
                            name: "Delete Role",
                            value: "deleterole",
                        }
                    ]
                },
                {
                    name: 'allow',
                    type: ApplicationCommandOptionType.String,
                    description: 'The rule are bypassable for who?',
                    required: false,
                    choices: [
                        {
                            name: 'Only the allowlist',
                            value: 'allowlist'
                        },
                        {
                            name: 'All of member',
                            value: 'member'
                        }
                    ]
                }
            ],
        },
        {
            name: "sanction",
            description: "Choose the sanction to applied for the flagged user!",
            type: 1,
            options: [
                {
                    name: 'choose',
                    type: ApplicationCommandOptionType.String,
                    description: 'Whats is the sanction then?',
                    required: true,
                    choices: [
                        {
                            name: "Simply Cancel Actions",
                            value: "simply"
                        },
                        {
                            name: "Simply Cancel Actions + Derank",
                            value: "simply+derank"
                        },
                        {
                            name: "Simply Cancel Actions + Ban",
                            value: "simply+ban"
                        }
                    ]
                },
            ],
        },
        {
            name: "config-show",
            description: "Show the current configuration about protection authorization/rule & allow list!",
            type: 1,
        },
    ],
    thinking: true,
    category: 'protection',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
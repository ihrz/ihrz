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
    name: "security",
    name_localizations: {
        "fr": "sécurité"
    },
    description: "Subcommand for security category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de securité"
    },
    options: [
        {
            name: "channel",
            name_localizations: {
                "fr": "définir-cannal"
            },
            description: "Channel where are been the verification process for new member(s)!",
            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.Channel,
                    description: 'What the channel then?',
                    required: true,
                },
            ],
        },
        {
            name: "disable",
            name_localizations: {
                "fr": "status"
            },
            description: "Disable or enable the Security Module feature!",
            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'What the action you want to do?',
                    required: true,
                    choices: [
                        {
                            name: "Power On",
                            value: "on",
                        },
                        {
                            name: "Power Off",
                            value: "off",
                        }
                    ]
                },
            ],
        },
        {
            name: "role-to-give",
            name_localizations: {
                "fr": "role-à-donner"
            },
            description: "The role that will be given to new member(s) when process to the Captcha verification!",
            type: 1,
            options: [
                {
                    name: 'role',
                    type: ApplicationCommandOptionType.Role,
                    description: 'What the the role then?',
                    required: true,
                },
            ],
        },
    ],
    thinking: false,
    category: 'security',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
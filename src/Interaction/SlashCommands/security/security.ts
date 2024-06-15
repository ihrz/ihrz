/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    Client,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType,
} from 'discord.js';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

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
            description_localizations: {
                "fr": "Canal où se déroule le processus de vérification pour les nouveaux membres"
            },

            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.Channel,

                    description: 'What the channel ?',
                    description_localizations: {
                        "fr": "Quelle est le channel ?"
                    },

                    required: true,
                },
            ],
        },
        {
            name: "disable",
            name_localizations: {
                "fr": "statut"
            },

            description: "Disable or enable the Security Module feature!",
            description_localizations: {
                "fr": "Désactiver ou activer la fonctionnalité du module de sécurité"
            },

            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,

                    description: 'What the action you want to do?',
                    description_localizations: {
                        "fr": "Quelle est l'action que vous souhaitez faire ?"
                    },

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
            description_localizations: {
                "fr": "Le rôle qui sera attribué aux nouveaux membre(s) lors du processus de vérification Captcha"
            },

            type: 1,
            options: [
                {
                    name: 'role',
                    type: ApplicationCommandOptionType.Role,

                    description: 'What the the role ?',
                    description_localizations: {
                        "fr": "Quel est le rôle ?"
                    },

                    required: true,
                },
            ],
        },
    ],
    thinking: false,
    category: 'security',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
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
    name: "ranks",

    description: "Subcommand for ranks category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de niveau (message)"
    },

    options: [
        {
            name: "disable",
            name_localizations: {
                "fr": "statut"
            },

            description: "Disable the message when user earn new xp level message!",
            description_localizations: {
                "fr": "Désactivez le message lorsque l'utilisateur gagne un nouveau message de niveau XP"
            },

            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,

                    description: 'What you want to do?',
                    description_localizations: {
                        "fr": "Que voulez-vous faire ?"
                    },

                    required: true,
                    choices: [
                        {
                            name: 'Power On the module (send message when user earn xp level)',
                            value: "on"
                        },
                        {
                            name: "Power Off the module (don't send any message but user still earn xp level)",
                            value: "off"
                        },
                        {
                            name: "Disable the module (don't send any message and user don't earn xp level)",
                            value: "disable"
                        },
                    ],
                },
            ],
        },
        {
            name: "show",
            name_localizations: {
                "fr": "afficher"
            },

            description: "Get the user's xp level!",
            description_localizations: {
                "fr": "Obtenez le niveau XP de l'utilisateur"
            },

            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user you want to lookup, keep blank if you want to show your stats',
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez rechercher."
                    },

                    required: false
                }
            ],
        },
        {
            name: "set-channel",
            name_localizations: {
                "fr": "définir-cannal"
            },

            description: "Set the channel where user earn new xp level message!",
            description_localizations: {
                "fr": "Définir le canal sur lequel l'utilisateur gagne un nouveau message de niveau XP"
            },

            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,

                    description: 'What you want to do?',
                    description_localizations: {
                        "fr": "Que voulez-vous faire ?"
                    },

                    required: true,
                    choices: [
                        {
                            name: "Remove the module (send xp message on the user's message channel)",
                            value: "off"
                        },
                        {
                            name: 'Power on the module (send xp message on a specific channel)',
                            value: "on"
                        }
                    ],
                },
                {
                    name: 'channel',
                    type: ApplicationCommandOptionType.Channel,

                    description: 'The specific channel for xp message !',
                    description_localizations: {
                        "fr": "Le canal spécifique pour le message XP"
                    },

                    required: false
                }
            ],
        },
        {
            name: "leaderboard",
            name_localizations: {
                "fr": "classement"
            },

            description: "Get the xp's leaderboard of the guild!",
            description_localizations: {
                "fr": "Obtenez le classement XP du serveur"
            },

            type: 1,
        },
    ],
    thinking: false,
    category: 'ranks',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
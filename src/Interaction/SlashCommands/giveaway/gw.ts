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
    name: "gw",
    description: "Subcommand for giveaway category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de giveaway"
    },
    options: [
        {
            name: "create",
            name_localizations: {
                "fr": "créer"
            },

            description: "Start a giveaway!",
            description_localizations: {
                "fr": "Commencer un giveaway"
            },

            type: 1,
            options: [
                {
                    name: 'winner',
                    type: ApplicationCommandOptionType.Number,

                    description: 'Number of winner for the giveaways',
                    description_localizations: {
                        "fr": "Nombre de gagnants pour les cadeaux"
                    },

                    required: true
                },
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,

                    description: 'The time duration of the giveaways',
                    description_localizations: {
                        "fr": "La durée des cadeaux"
                    },

                    required: true
                },
                {
                    name: 'prize',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway\'s prize',
                    description_localizations: {
                        "fr": "Le prix du cadeau"
                    },

                    required: true
                },
                {
                    name: 'image',
                    type: ApplicationCommandOptionType.String,

                    description: 'Image showed on the giveaway\'s embed',
                    description_localizations: {
                        "fr": "le lien d'une image qui seras inclu dans l'embed du giveaway"
                    },

                    required: false
                }
            ]
        },
        {
            name: "end",
            name_localizations: {
                "fr": "finnir"
            },

            description: "Stop a giveaway!",
            description_localizations: {
                "fr": "Arrêter un giveaway"
            },

            type: 1,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    description_localizations: {
                        "fr": "L'identifiant du cadeau (est l'identifiant du message du giveaway)"
                    },

                    required: true
                }
            ],
        },
        {
            name: "reroll",
            name_localizations: {
                "fr": "relancer"
            },

            description: "Reroll a giveaway winner(s)!",
            description_localizations: {
                "fr": "Relancez un ou plusieurs gagnants"
            },

            type: 1,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    description_localizations: {
                        "fr": "L'identifiant du cadeau (est l'identifiant du message du giveaway)"
                    },

                    required: true
                }
            ],
        },
        {
            name: "list-entries",
            name_localizations: {
                "fr": "afficher-les-participant"
            },

            description: "List all entries in giveaway!",
            description_localizations: {
                "fr": "Répertorier toutes les entrées dans le giveaway"
            },

            type: 1,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    description_localizations: {
                        "fr": "L'identifiant du cadeau (est l'identifiant du message du giveaway)"
                    },

                    required: true
                }
            ],
        },
        {
            name: 'get-data',
            name_localizations: {
                "fr": "get-data"
            },

            description: 'Get informations about a giveaway (JSON Body)',
            description_localizations: {
                "fr": "Obtenir des informations à propos d'un giveaways! (Format JSON)"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "giveaway-id",

                    description: "Giveaway's ID",
                    description_localizations: {
                        "fr": "L'identifiant du giveaways"
                    },

                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        },
        {
            name: 'get-all',
            name_localizations: {
                "fr": "get-all"
            },

            description: 'Get informations about all giveaways in a guild (JSON Body)',
            description_localizations: {
                "fr": "Obtenir des informations à propos de tout les giveaways d'un serveur! (Format JSON)"
            },

            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    thinking: true,
    category: 'giveaway',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
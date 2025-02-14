/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
    Client,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    Message,
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';

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
            prefixName: "gw-create",

            aliases: ["gstart", "gcreate"],

            description: "Start a giveaway!",
            description_localizations: {
                "fr": "Commencer un giveaway"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'winner',
                    type: ApplicationCommandOptionType.Number,

                    description: 'Number of winner for the giveaways',
                    description_localizations: {
                        "fr": "Nombre de gagnants pour les cadeaux"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,

                    description: 'The time duration of the giveaways',
                    description_localizations: {
                        "fr": "La durée des cadeaux"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: "requirement",

                    description: "The requirement to enter into the giveaway",
                    description_localizations: {
                        "fr": "Le prérequis pour rentrer dans le giveaways",
                    },

                    choices: [
                        {
                            name: "None",
                            value: "none"
                        },
                        {
                            name: "Need Specific invitations amount",
                            value: "invites"
                        },
                        {
                            name: "Need specific messages number",
                            value: "messages"
                        },
                        {
                            name: "Need specific roles",
                            value: "roles"
                        }
                    ],

                    type: ApplicationCommandOptionType.String,
                    required: true,

                    permission: null
                },
                {
                    name: 'prize',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway\'s prize',
                    description_localizations: {
                        "fr": "Le prix du cadeau"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'requirement-value',
                    type: ApplicationCommandOptionType.String,

                    description: 'The requirement value',
                    description_localizations: {
                        "fr": "La valeur du prérequis pour entrer dans le giveaways"
                    },

                    required: false,

                    permission: null
                },
                {
                    name: 'image',
                    type: ApplicationCommandOptionType.String,

                    description: 'Image showed on the giveaway\'s embed',
                    description_localizations: {
                        "fr": "le lien d'une image qui seras inclu dans l'embed du giveaway"
                    },

                    required: false,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.ManageMessages
        },
        {
            name: "end",
            name_localizations: {
                "fr": "finnir"
            },
            prefixName: "gw-end",

            aliases: ["gstop", "gbreak"],

            description: "Stop a giveaway!",
            description_localizations: {
                "fr": "Arrêter un giveaway"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    description_localizations: {
                        "fr": "L'identifiant du cadeau (est l'identifiant du message du giveaway)"
                    },

                    required: true,

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.ManageMessages
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

            aliases: ["re"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    description_localizations: {
                        "fr": "L'identifiant du cadeau (est l'identifiant du message du giveaway)"
                    },

                    required: true,

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.ManageGuild
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

            aliases: ["list"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'giveaway-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'The giveaway id (is the message id of the embed\'s giveaways)',
                    description_localizations: {
                        "fr": "L'identifiant du cadeau (est l'identifiant du message du giveaway)"
                    },

                    required: true,

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.ManageMessages
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

            aliases: ["get"],

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

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.ManageMessages
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

            aliases: ["gall"],

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.ManageMessages
        }
    ],
    thinking: true,
    category: 'giveaway',
    type: ApplicationCommandType.ChatInput,
    permission: null
};
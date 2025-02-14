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
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
    name: "suggest",

    description: "Subcommand for suggestion category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de suggestion"
    },

    options: [
        {
            name: "reply",
            name_localizations: {
                "fr": "répondre"
            },
            prefixName: "sug-reply",

            description: "Reply to the suggestion (need admin permission)!",
            description_localizations: {
                "fr": "Répondre à la suggestion (nécessite l'autorisation de l'administrateur)"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,

                    description: 'What the id of the suggestion?',
                    description_localizations: {
                        "fr": "Quelle est l'indentifiant de la suggestion ?"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'message',
                    type: ApplicationCommandOptionType.String,

                    description: 'What message you want reply?',
                    description_localizations: {
                        "fr": "Quelle message vous voulez laissez à la suggestion"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: "deny",
            name_localizations: {
                "fr": "refusé"
            },
            prefixName: "sug-deny",

            description: "Deny an suggestion (need admin permission)!",
            description_localizations: {
                "fr": "Refuser une suggestion (Requière les permission Admin)"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,

                    description: 'What the id of the suggestion?',
                    description_localizations: {
                        "fr": "Quelle est l'indentifiant de la suggestion ?"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'reason',
                    name_localizations: {
                        "fr": "raison"
                    },

                    type: ApplicationCommandOptionType.String,

                    description: 'What reason for you denying ?',
                    description_localizations: {
                        "fr": "Quelle message vous voulez laissez à la suggestion"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: "accept",
            name_localizations: {
                "fr": "accepté"
            },
            prefixName: "sug-accept",

            description: "Accept an suggestion (need admin permission)!",
            description_localizations: {
                "fr": "Accepter une suggestion (Requiert permissions Admin)"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,

                    description: 'What the id of the suggestion?',
                    description_localizations: {
                        "fr": "Quelle est l'indentifiant de la suggestion ?"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'reason',
                    name_localizations: {
                        "fr": "raison"
                    },

                    type: ApplicationCommandOptionType.String,

                    description: 'What reason for you accepting ?',
                    description_localizations: {
                        "fr": "Quelle message vous voulez laissez à la suggestion"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: "delete",
            name_localizations: {
                "fr": "supprimer"
            },
            prefixName: "sug-delete",

            description: "Delete an suggestion (need admin permission)!",
            description_localizations: {
                "fr": "Supprimer une suggestion (Requiert permissions Admin)"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,

                    description: 'What the id of the suggestion?',
                    description_localizations: {
                        "fr": "Quelle est l'indentifiant de la suggestion ?"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
        },
    ],
    category: 'suggestion',
    thinking: true,
    type: ApplicationCommandType.ChatInput,

    permission: null
};
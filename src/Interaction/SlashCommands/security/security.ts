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
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';

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
            prefixName: "security-channel",

            description: "Channel where are been the verification process for new member(s)!",
            description_localizations: {
                "fr": "Canal où se déroule le processus de vérification pour les nouveaux membres"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],

                    description: 'What the channel ?',
                    description_localizations: {
                        "fr": "Quelle est le channel ?"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: "disable",
            name_localizations: {
                "fr": "statut"
            },
            prefixName: "security-disable",

            description: "Disable or enable the Security Module feature!",
            description_localizations: {
                "fr": "Désactiver ou activer la fonctionnalité du module de sécurité"
            },

            type: ApplicationCommandOptionType.Subcommand,
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
                    ],

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
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

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'role',
                    type: ApplicationCommandOptionType.Role,

                    description: 'What the the role ?',
                    description_localizations: {
                        "fr": "Quel est le rôle ?"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: "role-to-remove",
            name_localizations: {
                "fr": "role-à-enlever"
            },

            description: "The role that will be removed to new member(s) when process to the Captcha verification!",
            description_localizations: {
                "fr": "Le rôle qui sera enlevé aux nouveaux membre(s) lors du processus de vérification Captcha"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'role',
                    type: ApplicationCommandOptionType.Role,

                    description: 'What the the role ?',
                    description_localizations: {
                        "fr": "Quel est le rôle ?"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.Administrator
        },
    ],
    thinking: false,
    category: 'security',
    type: ApplicationCommandType.ChatInput,

    permission: null
};
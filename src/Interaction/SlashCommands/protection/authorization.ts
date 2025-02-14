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

export const rules = [
    {
        placeholder: "Delete All Settings",
        value: "cls"
    },
    {
        placeholder: "Select All Rules",
        value: "all"
    },
    {
        placeholder: "Create Webhook",
        value: "webhook"
    },
    {
        placeholder: "Edit Guild",
        value: "updateguild"
    },
    {
        placeholder: "Create Channel",
        value: "createchannel",
    },
    {
        placeholder: "Update Channel",
        value: "updatechannel"
    },
    {
        placeholder: "Delete Channel",
        value: "deletechannel",
    },
    {
        placeholder: "Create Role",
        value: "createrole",
    },
    {
        placeholder: "Delete Role",
        value: "deleterole",
    },
    {
        placeholder: "Update Role",
        value: "updaterole",
    },
    {
        placeholder: "Add/Remove Member Role(s)",
        value: "updatemember"
    },
    {
        placeholder: "Ban Members",
        value: "banmembers",
    },
    {
        placeholder: "Kick Members",
        value: "kickmember",
    },
    {
        placeholder: "Unban Members",
        value: "unbanmembers",
    },
] as const

export const command: Command = {
    name: "protect",

    description: "Subcommand for protection category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de protection"
    },

    options: [
        {
            name: "actions",

            description: "Choose an actions to Deny/Allow for the user!",
            description_localizations: {
                "fr": "Choisissez une action à refuser/autoriser pour l'utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rule',
                    type: ApplicationCommandOptionType.String,

                    description: 'Whats is the rule to configure?',
                    description_localizations: {
                        "fr": "Quelle est la règle à configurer ?"
                    },

                    required: true,
                    choices: Object.entries(rules).map(([key, value]) => ({
                        name: value.placeholder,
                        value: value.value,
                    })),

                    permission: null
                },
                {
                    name: 'allow',
                    type: ApplicationCommandOptionType.String,

                    description: 'The rule are bypassable for who?',
                    description_localizations: {
                        "fr": "Les règles sont contournables pour qui ?"
                    },

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
                    ],

                    permission: PermissionFlagsBits.Administrator
                }
            ],

            permission: null
        },
        {
            name: "sanction",

            description: "Choose the sanction to applied for the flagged user!",
            description_localizations: {
                "fr": "Choisissez la sanction à appliquer pour l'utilisateur signalé?"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'choose',
                    type: ApplicationCommandOptionType.String,

                    description: 'Whats is the sanction then?',
                    description_localizations: {
                        "fr": "Quelle est donc la sanction ?"
                    },

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
                    ],

                    permission: null,
                },
            ],

            permission: PermissionFlagsBits.Administrator,
        },
        {
            name: "show",

            description: "Show the current configuration about protection authorization/rule & allow list!",
            description_localizations: {
                "fr": "Afficher la configuration des autorisations/règles de protection pour la liste d'autorisation"
            },

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.Administrator,
        },
    ],
    thinking: true,
    category: 'protection',
    type: ApplicationCommandType.ChatInput,

    permission: null
};
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
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    Message,
    PermissionFlagsBits,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
    name: "util",

    description: "SubCommand category for utils command",
    description_localizations: {
        "fr": "Commande sous groupé pour la catégorie utilitaire"
    },

    options: [
        {
            name: "nick-kicker",

            description: "Kick a user if their nickname contains a specific word",
            description_localizations: {
                "fr": "Expulse un utilisateur si son surnom contient un mot spécifique"
            },

            aliases: ["nickkick", "nk"],

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: 'zip-stickers',

            description: 'Create zip files with all guild stickers in!',
            description_localizations: {
                "fr": "Créer un fichier zip contenant absolument tout les stickers du serveur"
            },

            aliases: ["zipstickers", "zip2"],

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.ManageGuildExpressions
        },
        {
            name: 'wakeup',

            description: 'Wake up an user with mass mooving randomly in voice channel',
            description_localizations: {
                "fr": "Réveiller un utilisateur avec un déplacement massif aléatoire dans les salons vocaux"
            },

            aliases: ["wake"],

            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: 'member',

                    description: 'The member to wake up',
                    description_localizations: {
                        "fr": "Le membre à réveiller"
                    },

                    type: ApplicationCommandOptionType.User,

                    required: true,

                    permission: null
                }
            ],

            permission: [PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.MoveMembers]
        },
        {
            name: "autorenew",
            description: "Renew automaticaly X time a channel",

            description_localizations: {
                "fr": "Renouveller automatiquement un salon"
            },

            options: [
                {
                    name: "channel",

                    description: "The channel to renew every x times",
                    description_localizations: {
                        "fr": "Le salon qui ce renouveleras x temps"
                    },

                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],

                    required: true,
                    permission: null
                },
                {
                    name: "time",

                    description: "The x time",
                    description_localizations: {
                        "fr": "Le temps x"
                    },

                    type: ApplicationCommandOptionType.String,

                    required: true,
                    permission: null
                }
            ],

            permission: PermissionFlagsBits.Administrator,
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'where',
            aliases: ['whereis'],

            description: 'Sending the channel where the members is',
            description_localizations: {
                "fr": "Envoie le salon vocal où est le membre."
            },

            thinking: false,
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "member",

                    description: "The member you want to check",
                    description_localizations: {
                        "fr": "le membre que vous souhaitez vérifier"
                    },

                    permission: null,

                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ],

            permission: PermissionFlagsBits.ModerateMembers,
        },
        {
            name: 'serverpic',

            description: 'Sending the guild image',
            description_localizations: {
                "fr": "Envoie le logo du serveur"
            },

            thinking: false,
            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.ModerateMembers,
        }
    ],

    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    permission: null
};
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

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';


export const command: Command = {
    name: "mod",

    description: "Subcommand for moderation category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de modération"
    },

    options: [
        {
            name: 'ban',

            description: 'Ban a user!',
            description_localizations: {
                "fr": "Bannir un utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,

                    description: 'the member you want to ban',
                    description_localizations: {
                        "fr": "le membre que vous souhaitez bannir"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,

                    description: 'the reason of the bannisement',
                    description_localizations: {
                        "fr": "la raison du ban"
                    },

                    required: false,

                    permission: null
                }
            ],

            aliases: ["addban", "createban"],
            permission: PermissionFlagsBits.BanMembers
        },
        {
            name: 'baninfo',

            description: 'Check if user is banned and why',
            description_localizations: {
                "fr": "Vérifier si l'utilisateur est bannis du serveur et pourquoi"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'the member you want to check',
                    description_localizations: {
                        "fr": "le membre que vous souhaitez vérifier"
                    },

                    required: true,

                    permission: null
                },
            ],

            permission: PermissionFlagsBits.BanMembers
        },
        {
            name: 'clear',

            description: 'Clear a amount of message in the channel !',
            description_localizations: {
                "fr": "Effacer une quantité de message dans le cannal"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'number',
                    type: ApplicationCommandOptionType.Number,

                    description: 'The number of message you want to delete !',
                    description_localizations: {
                        "fr": "Le nombre de messages que vous souhaitez supprimer"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,

                    description: 'The member you want to delete the message',
                    description_localizations: {
                        "fr": "Le membre dont vous souhaitez supprimer les messages"
                    },

                    required: false,

                    permission: null
                }
            ],

            aliases: ["cls"],

            permission: PermissionFlagsBits.ManageMessages
        },
        {
            name: 'mutelist',

            description: 'Show a list with all muted member',
            description_localizations: {
                "fr": "Affiche une liste des gens mise en sourdine"
            },

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.ModerateMembers
        },
        {
            name: 'kick',

            description: 'Kick a user!',
            description_localizations: {
                "fr": "Expulser un utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,

                    description: 'the member you want to kick',
                    description_localizations: {
                        "fr": "le membre que vous voulez expulser"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,

                    description: 'the reason of the kick',
                    description_localizations: {
                        "fr": "la raison du kick"
                    },

                    required: false,

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.KickMembers
        },
        {
            name: 'lock',

            description: 'Remove ability to speak of all users in this text channel!',
            description_localizations: {
                "fr": "Supprimer la possibilité de parler de tous les utilisateurs de ce channel"
            },

            options: [
                {
                    name: "role",

                    description: "The role",
                    description_localizations: {
                        "fr": "le rôle"
                    },

                    required: false,
                    type: ApplicationCommandOptionType.Role,

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.Administrator,
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'lock-all',

            description: 'Remove ability to speak of all users in all channels!',
            description_localizations: {
                "fr": "Supprimer la possibilité de parler de tous les utilisateurs sur tous les channel"
            },

            options: [
                {
                    name: "role",

                    description: "The role",
                    description_localizations: {
                        "fr": "le rôle"
                    },

                    required: false,
                    type: ApplicationCommandOptionType.Role,

                    permission: null
                }
            ],

            aliases: ["lockall"],

            type: ApplicationCommandOptionType.Subcommand,
            permission: PermissionFlagsBits.Administrator
        },
        {
            name: 'tempmute',

            description: 'Temporarily mute a user!',
            description_localizations: {
                "fr": "Couper temporairement la possibilité d'envoyer des message pour un utilisateur"
            },

            aliases: ["mute"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user you want to unmuted',
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez dé-mute textuellement"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,

                    description: 'the duration of the user\'s tempmute',
                    description_localizations: {
                        "fr": "la durée du tempmute de l'utilisateur"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,

                    description: 'the reason why you tempmuted',
                    description_localizations: {
                        "fr": "la raison du tempmute"
                    },

                    required: false,

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.ModerateMembers
        },
        {
            name: 'unban',

            description: 'Unban a user!',
            description_localizations: {
                "fr": "Annuler le bannissement d'un utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'userid',
                    type: ApplicationCommandOptionType.String,

                    description: 'The id of the user you want to unban !',
                    description_localizations: {
                        "fr": "L'identifiant de l'utilisateur que vous souhaitez débannir"
                    },

                    required: true,

                    permission: null
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,

                    description: 'The reason for unbanning this user.',
                    description_localizations: {
                        "fr": "La raison du bannissement de cet utilisateur"
                    },

                    required: false,

                    permission: null
                }
            ],

            aliases: ["delban", "removeban"],

            permission: PermissionFlagsBits.BanMembers
        },
        {
            name: 'unlock',

            description: 'Give ability to speak of all users in this text!',
            description_localizations: {
                "fr": "Donner la possibilité de parler de tous les utilisateurs dans ce texte"
            },

            options: [
                {
                    name: "role",

                    description: "The role",
                    description_localizations: {
                        "fr": "le rôle"
                    },

                    required: false,
                    type: ApplicationCommandOptionType.Role,

                    permission: null
                }
            ],

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: 'unmute',

            description: 'Unmute a user!',
            description_localizations: {
                "fr": "Demute un utilisateur !"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user you want to unmuted',
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez unmuted"
                    },

                    required: true,

                    permission: null
                }
            ],

            permission: PermissionFlagsBits.ModerateMembers
        },
        {
            name: "warn",

            description: "warn a user",
            description_localizations: {
                "fr": "avertir un utilisateur"
            },

            options: [
                {
                    name: "member",

                    description: "The member you want to warn",
                    description_localizations: {
                        "fr": "le membre que vous voulez signaler"
                    },

                    type: ApplicationCommandOptionType.User,
                    required: true,

                    permission: null
                },
                {
                    name: "reason",

                    description: "The reason why you want to warn this member",
                    description_localizations: {
                        "fr": "La raison du warn"
                    },

                    type: ApplicationCommandOptionType.String,
                    required: true,

                    permission: null
                }
            ],

            type: ApplicationCommandOptionType.Subcommand,
            permission: PermissionFlagsBits.ModerateMembers
        },
        {
            name: "unwarn",

            description: "unwarn a user",
            description_localizations: {
                "fr": "supprimer un avertissement d'un utilisateur"
            },

            options: [
                {
                    name: "member",

                    description: "The member you want to unwarn",
                    description_localizations: {
                        "fr": "le membre que vous voulez enlever sont signalement"
                    },

                    type: ApplicationCommandOptionType.User,
                    required: true,

                    permission: null
                },
                {
                    name: "warn-id",

                    description: "The warn id",
                    description_localizations: {
                        "fr": "l'identifiant du warn"
                    },

                    type: ApplicationCommandOptionType.String,
                    required: true,

                    permission: null
                }
            ],

            type: ApplicationCommandOptionType.Subcommand,
            permission: PermissionFlagsBits.ModerateMembers
        },
        {
            name: "warnlist",

            description: "show all warns of a user",
            description_localizations: {
                "fr": "afficher tout les avertissement d'un utilisateur"
            },

            options: [
                {
                    name: "member",

                    description: "The member you want to lookup",
                    description_localizations: {
                        "fr": "le membre que vous shouaiter vérifier"
                    },

                    type: ApplicationCommandOptionType.User,
                    required: true,

                    permission: null
                }
            ],

            aliases: ["warns", "listwarns", "listwarn", "warnslist", "sanctions"],

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.ModerateMembers
        }
    ],
    thinking: true,
    category: 'moderation',
    type: ApplicationCommandType.ChatInput,
    permission: null
};
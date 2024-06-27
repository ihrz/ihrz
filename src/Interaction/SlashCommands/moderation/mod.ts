/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

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
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: "mod",

    description: "Subcommand for moderation category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de modération"
    },

    options: [
        {
            name: "avatar",

            description: "Pick the avatar of a user!",
            description_localizations: {
                "fr": "Récuperer l'avatar d'un utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user',
                    description_localizations: {
                        "fr": "L'utilisateur"
                    },

                    required: false
                }
            ],
        },
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

                    required: true
                }
            ],
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

                    required: true
                }
            ],
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

                    required: true
                }
            ],
        },
        {
            name: 'lock',

            description: 'Remove ability to speak of all users in this text channel!',
            description_localizations: {
                "fr": "Supprimer la possibilité de parler de tous les utilisateurs de ce channel"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'lock-all',

            description: 'Remove ability to speak of all users in all channels!',
            description_localizations: {
                "fr": "Supprimer la possibilité de parler de tous les utilisateurs sur tous les channel"
            },

            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'tempmute',

            description: 'Temporarily mute a user!',
            description_localizations: {
                "fr": "Couper temporairement la possibilité d'envoyer des message pour un utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user you want to unmuted',
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez dé-mute textuellement"
                    },

                    required: true
                },
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,

                    description: 'the duration of the user\'s tempmute',
                    description_localizations: {
                        "fr": "la durée du tempmute de l'utilisateur"
                    },

                    required: true
                }
            ],
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

                    required: true
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,

                    description: 'The reason for unbanning this user.',
                    description_localizations: {
                        "fr": "La raison du bannissement de cet utilisateur"
                    },

                    required: false
                }
            ],
        },
        {
            name: 'unlock',

            description: 'Give ability to speak of all users in this text!',
            description_localizations: {
                "fr": "Donner la possibilité de parler de tous les utilisateurs dans ce texte"
            },

            type: ApplicationCommandOptionType.Subcommand
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
                    
                    required: true
                }
            ],
        }
    ],
    thinking: true,
    category: 'moderation',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
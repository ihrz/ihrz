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
    name: "ticket",

    description: "Subcommand for ticket category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de ticket"
    },

    options: [
        {
            name: "add",

            description: "Add a member into your ticket!",
            description_localizations: {
                "fr": "Ajoutez un membre dans votre ticket"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user you want to add into your ticket',
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez ajouter à votre ticket"
                    },

                    required: true
                }
            ],
        },
        {
            name: "close",

            description: "Close a ticket!",
            description_localizations: {
                "fr": "Fermer un ticket"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "delete",

            description: "Delete a iHorizon ticket!",
            description_localizations: {
                "fr": "Supprimer un ticket"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "disable",

            description: "Disable ticket commands on a guild!",
            description_localizations: {
                "fr": "Désactiver les commande de ticket au seins du serveur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,

                    description: 'What you want to do ?',
                    description_localizations: {
                        "fr": "Que veux-tu faire? "
                    },

                    required: true,
                    choices: [
                        {
                            name: "Remove the module",
                            value: "off"
                        },
                        {
                            name: 'Power on the module',
                            value: "on"
                        },
                    ],
                },
            ],
        },
        {
            name: 'log-channel',

            description: "Set a channel where iHorizon sent a logs about tickets!",
            description_localizations: {
                "fr": "Définir un canal sur lequel iHorizon a envoyé des journaux sur les tickets"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    type: ApplicationCommandOptionType.Channel,

                    description: 'Where you want the logs',
                    description_localizations: {
                        "fr": "Où voulez-vous les journaux ?"
                    },

                    required: true
                }
            ],
        },
        {
            name: "open",

            description: "re-open a closed ticket!",
            description_localizations: {
                "fr": "Re-ouvrir un ticket fermet"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'remove',

            description: "Remove a member from your ticket!",
            description_localizations: {
                "fr": "Enlever un membre d'un ticket"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user you want to remove into your ticket',
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez supprimer de votre ticket"
                    },

                    required: true
                }
            ],
        },
        {
            name: "set-here",

            description: "Make a embed for allowing to user to create a ticket!",
            description_localizations: {
                "fr": "Créer un embed pour permettre à l'utilisateur de créer un ticket"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "name",

                    description: "The name of you ticket's panel.",
                    description_localizations: {
                        "fr": "Le nom du panneau de votre ticket"
                    },

                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "description",

                    description: "The description of you ticket's panel.",
                    description_localizations: {
                        "fr": "La description du panneau de votre ticket"
                    },

                    type: ApplicationCommandOptionType.String,
                    required: false,
                }
            ],
        },
        {
            name: "set-category",

            description: "Set the category where ticket are create!",
            description_localizations: {
                "fr": "Définir la catégorie dans laquelle les ticket doivent être créés"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "category-name",

                    description: "The name of you ticket's panel.",
                    description_localizations: {
                        "fr": "Le nom du panneau de votre ticket"
                    },

                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                }
            ],
        },
        {
            name: "transcript",

            description: "Get the transript of a ticket message!",
            description_localizations: {
                "fr": "Obtenir la transcription d'un message de ticket"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
    thinking: true,
    category: 'ticket',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
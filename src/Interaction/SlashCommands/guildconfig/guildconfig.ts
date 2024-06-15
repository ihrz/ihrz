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
    name: "guildconfig",

    description: "Subcommand for guildconfig category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de configuration du serveur"
    },

    options: [
        {
            name: 'setup',

            description: 'Setup the logs channel about the bot!',
            description_localizations: {
                "fr": "Configurer le canal de journaux sur le bot"
            },

            type: 1
        },
        {
            name: 'block',

            description: 'Block/Protect someting/behaviours into this guild!',
            description_localizations: {
                "fr": "Bloquer/Protéger certains comportements/comportements dans cette guilde"
            },

            type: 2,
            options: [
                {
                    name: 'bot',

                    description: 'Block the ability to add new bots into this server',
                    description_localizations: {
                        "fr": "Bloquer la possibilité d'ajouter de nouveaux robots sur ce serveur"
                    },

                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,

                            description: 'What you want to do?',
                            description_localizations: {
                                "fr": "Que veux-tu faire?"
                            },

                            required: true,
                            choices: [
                                {
                                    name: 'Power On',
                                    value: "on"
                                },
                                {
                                    name: "Power Off",
                                    value: "off"
                                }
                            ],
                        }
                    ],
                },
                {
                    name: 'too-new-account',
                    name_localizations: {
                        fr: "compte-trop-recent"
                    },

                    description: 'Block accounts that are too new from joining your server',
                    description_localizations: {
                        "fr": "Bloquer les compte trop récent de rejoindre votre serveur"
                    },

                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,

                            description: 'What you want to do?',
                            description_localizations: {
                                "fr": "Que veux-tu faire?"
                            },

                            required: true,
                            choices: [
                                {
                                    name: 'Power On',
                                    value: "on"
                                },
                                {
                                    name: "Power Off",
                                    value: "off"
                                }
                            ],
                        },
                        {
                            name: 'maximum-date',
                            type: ApplicationCommandOptionType.String,

                            description: 'Minimum seniority time',
                            description_localizations: {
                                "fr": "Temps minimum d'ancienneté"
                            },

                            required: false,
                        }
                    ],
                },
            ],
        },
        {
            name: 'show',

            description: 'Get the guild configuration!',
            description_localizations: {
                "fr": "Obtenez la configuration du serveur"
            },

            type: 1,
        },
        {
            name: 'set',

            description: 'Set someting/behaviours into this guild!',
            description_localizations: {
                "fr": "Définir quelque chose/comportements dans ce serveur"
            },

            type: 2,
            options: [
                {
                    name: 'channel',

                    description: 'Set the channel where the bot will send message when user leave/join guild!',
                    description_localizations: {
                        "fr": "Définir le canal pour les messages de départ/arrivée d'utilisateurs sur le serveur."
                    },

                    type: 1,
                },
                {
                    name: 'join-dm',

                    description: 'Set a join dm message when user join the guild!',
                    description_localizations: {
                        "fr": "Définir un message de participation au DM lorsque l'utilisateur rejoint le serveur"
                    },

                    type: 1,
                },
                {
                    name: 'join-message',

                    description: 'Set a join message when user join the guild!',
                    description_localizations: {
                        "fr": "Définir un message d'adhésion lorsque l'utilisateur rejoint le serveur"
                    },

                    type: 1,
                },
                {
                    name: 'join-role',

                    description: 'Set a join roles when user join the guild!',
                    description_localizations: {
                        "fr": "Définissez des rôles de participation lorsque l'utilisateur rejoint le serveur!"
                    },

                    type: 1,
                },
                {
                    name: 'leave-message',

                    description: 'Set a leave message when user leave the guild!',
                    description_localizations: {
                        "fr": "Définir un message de départ lorsque l'utilisateur quitte le serveur"
                    },

                    type: 1,
                }
            ],
        },
    ],
    thinking: true,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};

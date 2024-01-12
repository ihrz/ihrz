/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import {
    Client,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType,
} from 'discord.js';

import { Command } from '../../../../types/command';

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
                    options: [
                        {
                            name: 'type',
                            type: ApplicationCommandOptionType.String,

                            description: '<On join/On leave/Delete all settings>',
                            description_localizations: {
                                "fr": "<En rejoignant/En partant/Supprimer tous les paramètres>"
                            },

                            required: true,
                            choices: [
                                {
                                    name: "On join",
                                    value: "join"
                                },
                                {
                                    name: "On leave",
                                    value: "leave"
                                },
                                {
                                    name: "Delete all settings",
                                    value: "off"
                                }
                            ]
                        },
                        {
                            name: 'channel',
                            type: ApplicationCommandOptionType.Channel,

                            description: "The channel you wan't your welcome/goodbye message !",
                            description_localizations: {
                                "fr": "La chaîne sur laquelle vous souhaitez recevoir votre message de bienvenue/au revoir"
                            },

                            required: false
                        }
                    ],
                },
                {
                    name: 'join-dm',

                    description: 'Set a join dm message when user join the guild!',
                    description_localizations: {
                        "fr": "Définir un message de participation au DM lorsque l'utilisateur rejoint le serveur"
                    },

                    type: 1,
                    options: [
                        {
                            name: "value",

                            description: "Choose the action you want to do",
                            description_localizations: {
                                "fr": "Choisissez l'action que vous souhaitez faire"
                            },

                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "on"
                                },
                                {
                                    name: "Power off",
                                    value: "off"
                                },
                                {
                                    name: "Show the message set",
                                    value: "ls"
                                }
                            ]
                        },
                        {
                            name: 'message',
                            type: ApplicationCommandOptionType.String,

                            description: '<Message if the first args is on>',
                            description_localizations: {
                                "fr": "<Message si le premier argument est activé>"
                            },

                            required: false
                        }
                    ],
                },
                {
                    name: 'join-message',

                    description: 'Set a join message when user join the guild!',
                    description_localizations: {
                        "fr": "Définir un message d'adhésion lorsque l'utilisateur rejoint le serveur"
                    },

                    type: 1,
                    options: [
                        {
                            name: "value",

                            description: "<Power on /Power off/Show the message set>",
                            description_localizations: {
                                "fr": "<Allumer / Éteindre / Afficher le messages définis>"
                            },

                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "on"
                                },
                                {
                                    name: "Power off",
                                    value: "off"
                                },
                                {
                                    name: "Show the message set",
                                    value: "ls"
                                },
                                {
                                    name: "Need help",
                                    value: "needhelp"
                                }
                            ]
                        },
                        {
                            name: 'message',
                            type: ApplicationCommandOptionType.String,

                            description: `{user}:username| {membercount}:guild member count| {createdat}:user create date| {guild}:Guild name`,
                            description_localizations: {
                                "fr": "{user}:username| {membercount}:guild member count| {createdat}:user create date| {guild}:Guild name"
                            },

                            required: false
                        },
                    ],
                },
                {
                    name: 'join-role',

                    description: 'Set a join roles when user join the guild!',
                    description_localizations: {
                        "fr": "Définissez des rôles de participation lorsque l'utilisateur rejoint le serveur!"
                    },

                    type: 1,
                    options: [
                        {
                            name: "value",

                            description: "<Power on /Power off/Show the message set>",
                            description_localizations: {
                                "fr": "<Power on /Power off/Show the message set>"
                            },

                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "true"
                                },
                                {
                                    name: "Power off",
                                    value: "false"
                                },
                                {
                                    name: "Show the roles set",
                                    value: "ls"
                                },
                                {
                                    name: "Need help",
                                    value: "needhelp"
                                }
                            ]
                        },
                        {
                            name: 'roles',
                            type: ApplicationCommandOptionType.Role,

                            description: '<roles id>',
                            description_localizations: {
                                "fr": "<Indentifiant du rôle>"
                            },

                            required: false
                        }
                    ],
                },
                {
                    name: 'leave-message',

                    description: 'Set a leave message when user leave the guild!',
                    description_localizations: {
                        "fr": "Définir un message de départ lorsque l'utilisateur quitte le serveur"
                    },

                    type: 1,
                    options: [
                        {
                            name: "value",

                            description: "<Power on /Power off/Show the message set>",
                            description_localizations: {
                                "fr": "<Power on /Power off/Show the message set>"
                            },

                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: "Power on",
                                    value: "on"
                                },
                                {
                                    name: "Power off",
                                    value: "off"
                                },
                                {
                                    name: "Show the message set",
                                    value: "ls"
                                },
                                {
                                    name: "Need help",
                                    value: "needhelp"
                                }
                            ]
                        },
                        {
                            name: 'message',
                            
                            description: `{user} = Username of Member | {membercount} = guild's member count | {guild} = The name of the guild`,
                            description_localizations: {
                                "fr": "{user} = Username of Member | {membercount} = guild's member count | {guild} = The name of the guild"
                            },

                            type: ApplicationCommandOptionType.String,
                            required: false
                        },
                    ],
                }
            ],
        },
    ],
    thinking: true,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
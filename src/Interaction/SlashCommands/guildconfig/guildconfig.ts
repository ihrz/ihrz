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

            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'block',

            description: 'Block/Protect someting/behaviours into this guild!',
            description_localizations: {
                "fr": "Bloquer/Protéger certains comportements/comportements dans cette guilde"
            },

            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'bot',

                    description: 'Block the ability to add new bots into this server',
                    description_localizations: {
                        "fr": "Bloquer la possibilité d'ajouter de nouveaux robots sur ce serveur"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
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

                    type: ApplicationCommandOptionType.Subcommand,
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

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'set',

            description: 'Set someting/behaviours into this guild!',
            description_localizations: {
                "fr": "Définir quelque chose/comportements dans ce serveur"
            },

            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'channel',

                    description: 'Set the channel where the bot will send message when user leave/join guild!',
                    description_localizations: {
                        "fr": "Définir le canal pour les messages de départ/arrivée d'utilisateurs sur le serveur."
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: 'join-dm',

                    description: 'Set a join dm message when user join the guild!',
                    description_localizations: {
                        "fr": "Définir un message de participation au DM lorsque l'utilisateur rejoint le serveur"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: 'join-message',

                    description: 'Set a join message when user join the guild!',
                    description_localizations: {
                        "fr": "Définir un message d'adhésion lorsque l'utilisateur rejoint le serveur"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: 'join-role',

                    description: 'Set a join roles when user join the guild!',
                    description_localizations: {
                        "fr": "Définissez des rôles de participation lorsque l'utilisateur rejoint le serveur!"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: 'leave-message',

                    description: 'Set a leave message when user leave the guild!',
                    description_localizations: {
                        "fr": "Définir un message de départ lorsque l'utilisateur quitte le serveur"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                }
            ],
        },
        {
            name: 'set-bot',

            description: 'Set someting/behaviours in the bot!',
            description_localizations: {
                "fr": "Définir quelque chose/comportements dans le bot!"
            },

            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'footer-name',

                    description: 'Set the footer name for all of the iHorizon embed !',
                    description_localizations: {
                        "fr": "Définir le nom du footer pour tout les embeds d'iHorizon"
                    },

                    options: [
                        {
                            name: "name",

                            description: "The footer name",
                            description_localizations: {
                                "fr": "Le noms du footer"
                            },

                            type: ApplicationCommandOptionType.String,
                            required: true
                        }
                    ],

                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: 'prefix',

                    description: 'Change the message commands\'s prefix in this guild!',
                    description_localizations: {
                        "fr": "Changer le préfixe des commande de message sur ce serveur"
                    },

                    options: [
                        {
                            name: "action",

                            description: "What do you want to do?",
                            description_localizations: {
                                "fr": "Que voulez-vous faire ?"
                            },

                            choices: [
                                {
                                    name: `Default prefix`,
                                    value: "mention"
                                },
                                {
                                    name: "Change prefix",
                                    value: "change"
                                }
                            ],

                            type: ApplicationCommandOptionType.String,
                            required: true
                        },
                        {
                            name: "name",

                            description: "The footer name",
                            description_localizations: {
                                "fr": "Le noms du footer"
                            },

                            type: ApplicationCommandOptionType.String,
                            required: false
                        }
                    ],

                    type: ApplicationCommandOptionType.Subcommand,
                },
            ],
        },
    ],
    thinking: true,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};

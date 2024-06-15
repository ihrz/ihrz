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
    name: "automod",

    description: "Subcommand for automod category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de protection via l'automod"
    },

    options: [
        {
            name: 'block',

            description: 'Block/Protect someting/behaviours into this guild!',
            description_localizations: {
                "fr": "Bloquer/Protéger certains comportements/comportements dans ce serveur"
            },

            type: 2,
            options: [
                {
                    name: 'pub',

                    description: 'Allow/Unallow the user to send a advertisement into them messages!',
                    description_localizations: {
                        "fr": "Autoriser/Interdire à l'utilisateur d'envoyer une publicité dans ses messages"
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
                                    name: "Power On",
                                    value: "on"
                                },
                                {
                                    name: 'Power Off',
                                    value: "off"
                                },
                            ],
                        },
                        {
                            name: 'logs-channel',

                            description: 'The channel you want logs when user break the rules!',
                            description_localizations: {
                                "fr": "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles"
                            },

                            type: ApplicationCommandOptionType.Channel,
                            required: false
                        }
                    ],
                },
                {
                    name: 'spam',

                    description: 'Block the spam message in this server!',
                    description_localizations: {
                        "fr": "Bloquer le message spam sur ce serveur"
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
                            name: 'logs-channel',

                            description: 'The channel you want logs when user break the rules',
                            description_localizations: {
                                "fr": "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles"
                            },

                            type: ApplicationCommandOptionType.Channel,
                            required: false
                        }
                    ],
                },
                {
                    name: 'mass-mention',

                    description: 'Block the spam which have mass-mention in this message!',
                    description_localizations: {
                        "fr": "Bloquez les spams mentionnés en masse dans ce message"
                    },

                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,

                            description: 'What you want to do?',
                            description_localizations: {
                                "fr": "Que voulez-vous faire?"
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
                            name: 'max-mention-allowed',
                            type: ApplicationCommandOptionType.Number,

                            description: "Max amount of mention allowed in only one message !",
                            description_localizations: {
                                "fr": "Nombre maximum de mentions autorisées dans un seul message"
                            },

                            required: false
                        },
                        {
                            name: 'logs-channel',

                            description: "The channel you want logs when user break the rules",
                            description_localizations: {
                                "fr": "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles"
                            },

                            type: ApplicationCommandOptionType.Channel,
                            required: false
                        }
                    ],
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
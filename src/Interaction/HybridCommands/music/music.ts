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
    Message,
    EmbedBuilder,
} from 'discord.js';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';

export const command: Command = {
    name: "music",
    name_localizations: {
        "fr": "musique"
    },

    description: "Subcommand for music category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de musique"
    },

    aliases: ["m"],

    options: [
        {
            name: 'loop',
            name_localizations: {
                "fr": "boucle"
            },

            description: 'Set loop mode of the guild!',
            description_localizations: {
                "fr": "Changer l'état de la boucle sur le serveur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'mode',
                    type: ApplicationCommandOptionType.String,

                    description: 'Loop Type',
                    description_localizations: {
                        "fr": "Status de la boucle"
                    },

                    required: true,
                    choices: [
                        {
                            name: 'Off',
                            value: 'off'
                        },
                        {
                            name: 'On',
                            value: 'track'
                        }
                    ]
                }
            ],
        },
        {
            name: 'lyrics',

            description: 'Find the lyrics of a title!',
            description_localizations: {
                "fr": "Trouver les lyrics d'un titre"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'query',
                    type: ApplicationCommandOptionType.String,

                    description: 'The track title you want',
                    description_localizations: {
                        "fr": "Titre de la musique"
                    },

                    required: true
                },
            ],
        },
        {
            name: 'history',
            name_localizations: {
                "fr": "historique",
            },

            description: "See the history of all the music played in this guild!",
            description_localizations: {
                "fr": "Voir toute les musique joué dans un ordre chronologique sur le serveur"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'nowplaying',
            name_localizations: {
                "fr": "en-lecture"
            },

            description: 'Get the current playing song!',
            description_localizations: {
                "fr": "Obtenez la chanson en cours de lecture"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'pause',

            description: 'Pause the current playing song!',
            description_localizations: {
                "fr": "Mettre en pause la musique actuelle"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'play',

            description: 'Play a song!',
            description_localizations: {
                "fr": "Jouer une musique!"
            },

            aliases: ["p"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'source',
                    type: ApplicationCommandOptionType.String,

                    description: "Select an source of music",
                    description_localizations: {
                        'fr': "Choisir la source de la musique"
                    },

                    choices: [
                        { name: "Any", value: "ytsearch" },
                        // { name: "Youtube", value: "ytsearch" },
                        // { name: "Youtube Music", value: "ytmsearch" },
                        { name: "Soundcloud", value: "scsearch" },
                        // { name: "Deezer", value: "dzsearch" },
                        { name: "Spotify", value: "spsearch" },
                        // { name: "Apple Music", value: "amsearch" },
                    ],

                    required: true
                },
                {
                    name: 'title',
                    type: ApplicationCommandOptionType.String,

                    description: 'The track title you want (you can put URL as you want)',
                    description_localizations: {
                        "fr": "Titre de la musique (URL si vous le voulez)"
                    },

                    required: true
                },
            ],
        },
        {
            name: 'queue',

            description: 'Get the queue!',
            description_localizations: {
                "fr": "Obtenir la file d'attente des musique sur le serveur!"
            },

            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'resume',
            name_localizations: {
                "fr": "reprendre"
            },

            description: 'Resume the current playing song!',
            description_localizations: {
                "fr": "Reprendre la chanson en cours de lecture"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'shuffle',
            name_localizations: {
                "fr": "mélanger"
            },

            description: 'Shuffle the queue!',
            description_localizations: {
                "fr": "Mélangez la file d'attente"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'skip',

            description: 'Skip the current playing song!',
            description_localizations: {
                "fr": "Passer la chanson en cours de lecture"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'stop',

            description: 'Stop the current playing song!',
            description_localizations: {
                "fr": "Couper la musique"
            },

            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    thinking: true,
    category: 'music',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, runningCommand: SubCommandArgumentValue, execTimestamp?: number, options?: string[]) => {
        let fetchedCommand;
        let sub: SubCommandArgumentValue | undefined;

        if (interaction instanceof ChatInputCommandInteraction) {
            fetchedCommand = interaction.options.getSubcommand();
        } else {
            if (!options?.[0]) {
                await client.method.interactionSend(interaction, { embeds: [await client.method.createAwesomeEmbed(lang, command, client, interaction)] });
                return;
            }
            const cmd = command.options?.find(x => options[0] === x.name || x.aliases?.includes(options[0]));
            sub = { name: command.name, command: cmd };
            if (!cmd) return;

            fetchedCommand = cmd.name;
            options.shift();
        }

        const commandModule = await import(`./!${fetchedCommand}.js`);
        await commandModule.default.run(client, interaction, lang, sub, execTimestamp, options);
    },
};
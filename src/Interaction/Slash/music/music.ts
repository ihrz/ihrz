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

import { QueueRepeatMode } from 'discord-player';
import { Command } from '../../../../types/command';

export const command: Command = {
    name: "music",
    name_localizations: {
        "fr": "musique"
    },

    description: "Subcommand for music category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de musique"
    },

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

            type: 1,
            options: [
                {
                    name: 'mode',
                    type: ApplicationCommandOptionType.Integer,

                    description: 'Loop Type',
                    description_localizations: {
                        "fr": "Status de la boucle"
                    },

                    required: true,
                    choices: [
                        {
                            name: 'Off',
                            value: QueueRepeatMode.OFF
                        },
                        {
                            name: 'On',
                            value: QueueRepeatMode.TRACK
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

            type: 1,
            options: [
                {
                    name: 'title',
                    type: ApplicationCommandOptionType.String,

                    description: 'The track title you want (you can put URL as you want)',
                    description_localizations: {
                        "fr": "Titre de la musique (URL si vous le voulez)"
                    },

                    required: true
                }
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

            type: 1,
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
            
            type: 1,
        },
        {
            name: 'pause',

            description: 'Pause the current playing song!',
            description_localizations: {
                "fr": "Mettre en pause la musique actuelle"
            },

            type: 1,
        },
        {
            name: 'play',

            description: 'Play a song!',
            description_localizations: {
                "fr": "Jouer une musique!"
            },

            type: 1,
            options: [
                {
                    name: 'title',
                    type: ApplicationCommandOptionType.String,

                    description: 'The track title you want (you can put URL as you want)',
                    description_localizations: {
                        "fr": "Titre de la musique (URL si vous le voulez)"
                    },

                    required: true
                }
            ],
        },
        {
            name: 'queue',

            description: 'Get the queue!',
            description_localizations: {
                "fr": "Obtenir la file d'attente des musique sur le serveur!"
            },

            type: 1
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

            type: 1,
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

            type: 1,
        },
        {
            name: 'skip',
            
            description: 'Skip the current playing song!',
            description_localizations: {
                "fr": "Passer la chanson en cours de lecture"
            },

            type: 1,
        },
        {
            name: 'stop',

            description: 'Stop the current playing song!',
            description_localizations: {
                "fr": "Couper la musique"
            },

            type: 1,
        }
    ],
    thinking: true,
    category: 'music',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
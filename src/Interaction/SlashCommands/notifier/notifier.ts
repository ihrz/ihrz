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
    ChannelType,
} from 'discord.js';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';

export const command: Command = {
    name: "notifier",

    description: "Subcommand category for notifier!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie des notifications de vidéo/short/stream"
    },

    options: [
        {
            name: "author",

            description: "Streamer/Youtuber/Twitcher manipulation",
            description_localizations: {
                fr: "Manipulation pour les streamer, youtubeur, twticherm vidéaste"
            },

            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "add",

                    description: "Add Streamer/Youtuber/Twitcher",
                    description_localizations: {
                        fr: "Ajouter Streamer/Youtuber/Twitcher"
                    },

                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "platform",

                            description: "The Streamer/Youtuber/Twitcher platform",
                            description_localizations: {
                                fr: "La plateforme du Streamer/Youtuber/Twitcher"
                            },

                            type: ApplicationCommandOptionType.String,

                            choices: [
                                {
                                    name: "Youtube",
                                    value: "youtube"
                                },
                                {
                                    name: "Twitch",
                                    value: "twitch"
                                }
                            ],

                            required: true
                        },
                        {
                            name: "author",

                            description: "The Streamer/Youtuber/Twitcher ID",
                            description_localizations: {
                                fr: "L'identifiant du Streamer/Youtuber/Twitcher"
                            },

                            type: ApplicationCommandOptionType.String,

                            required: true
                        }
                    ]
                },
                {
                    name: "remove",

                    description: "Remove Streamer/Youtuber/Twitcher",
                    description_localizations: {
                        fr: "supprimer Streamer/Youtuber/Twitcher"
                    },

                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "platform",

                            description: "The Streamer/Youtuber/Twitcher platform",
                            description_localizations: {
                                fr: "La plateforme du Streamer/Youtuber/Twitcher"
                            },

                            type: ApplicationCommandOptionType.String,

                            choices: [
                                {
                                    name: "Youtube",
                                    value: "youtube"
                                },
                                {
                                    name: "Twitch",
                                    value: "twitch"
                                }
                            ],

                            required: true
                        },
                        {
                            name: "author",

                            description: "The Streamer/Youtuber/Twitcher ID",
                            description_localizations: {
                                fr: "L'identifiant du Streamer/Youtuber/Twitcher"
                            },

                            type: ApplicationCommandOptionType.String,

                            required: true
                        },
                    ]
                },
                {
                    name: "list",

                    description: "Show Streamer/Youtuber/Twitcher",
                    description_localizations: {
                        fr: "supprimer Streamer/Youtuber/Twitcher"
                    },

                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        {
            name: "config",

            description: "Configuration for the Notifier Module",
            description_localizations: {
                fr: "La configuration pour le module de Notifier"
            },

            options: [
                {
                    name: "channel",

                    description: "When a Streamer/Youtuber/Twitcher publish a video, iHorizon send a message in channel",
                    description_localizations: {
                        fr: "Lorsqu'un Streamer/Youtuber/Twitcher publie une vidéo, iHorizon envoie un message dans le canal"
                    },

                    options: [
                        {
                            name: "chann",

                            description: "The channel",
                            description_localizations: {
                                fr: "Le salon textuelle"
                            },

                            channel_types: [ChannelType.GuildText],
                            type: ApplicationCommandOptionType.Channel,
                            required: true
                        }
                    ],

                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "message",

                    description: "When a Streamer/Youtuber/Twitcher publish a video, iHorizon send a message",
                    description_localizations: {
                        fr: "Lorsqu'un Streamer/Youtuber/Twitcher publie une vidéo, iHorizon envoie un message"
                    },

                    type: ApplicationCommandOptionType.Subcommand
                }
            ],

            type: ApplicationCommandOptionType.SubcommandGroup,
        }
    ],
    thinking: false,
    category: 'notifier',
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
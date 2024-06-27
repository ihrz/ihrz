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
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChannelType,
    ChatInputCommandInteraction,
    Client,
} from 'pwss'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'voice',

    options: [
        {
            name: "interface",
            name_localizations: {
                "fr": "gérer"
            },

            type: ApplicationCommandOptionType.SubcommandGroup,

            description: "Manage voice's interface",
            description_localizations: {
                "fr": "Gérer les intefaces de créations de vocal"
            },

            options: [
                {
                    name: "set-voice-channel",
                    type: ApplicationCommandOptionType.Subcommand,

                    description: "Set the channel for Join4Create!",
                    description_localizations: {
                        "fr": "Définis le salon où le membre ce connecte pour créer son propre channel"
                    },

                    options: [
                        {
                            name: "channel",
                            type: ApplicationCommandOptionType.Channel,
                            channel_types: [ChannelType.GuildVoice],

                            description: "The channel you want",
                            description_localizations: {
                                "fr": "Le salon où les gens devront rejoindre pour créer leur propre salon"
                            },

                            required: true,
                        }
                    ]
                },
                {
                    name: "set-text-channel",
                    type: ApplicationCommandOptionType.Subcommand,

                    description: "Send an interface to the channel for manage them own voice channel",
                    description_localizations: {
                        "fr": "Envoyer une interface au canal pour gérer son propre canal vocal"
                    },

                    options: [
                        {
                            name: "channel",
                            type: ApplicationCommandOptionType.Channel,
                            channel_types: [ChannelType.GuildText],

                            description: "The channel you want the dashboard interface are sended",
                            description_localizations: {
                                "fr": "Le salon où l'interface seras envoyer"
                            },

                            required: true,
                        }
                    ]
                },
                {
                    name: "set-staff-role",
                    type: ApplicationCommandOptionType.Subcommand,

                    description: "Set an role for bypassing TempChannel's permission",
                    description_localizations: {
                        "fr": "Définir un rôle pour contourner l'autorisation des canaux temporaires"
                    },

                    options: [
                        {
                            name: "role",
                            type: ApplicationCommandOptionType.Role,

                            description: "The role for the staff to bypass permission into the TempChannels",
                            description_localizations: {
                                "fr": "Le rôle du personnel pour contourner l'autorisation dans les TempChannel"
                            },

                            required: true,
                        }
                    ]
                }
            ]
        },

    ],

    description: "Subcommand group for voice's manager",
    description_localizations: {
        "fr": "Commande sous-groupé pour la gestion de channel vocal"
    },

    category: 'voicedashboard',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};

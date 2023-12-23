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
    description: "Subcommand for music category!",
    options: [
        {
            name: 'loop',
            description: 'Set loop mode of the guild!',
            type: 1,
            options: [
                {
                    name: 'mode',
                    type: ApplicationCommandOptionType.Integer,
                    description: 'Loop Type',
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
            type: 1,
            options: [
                {
                    name: 'title',
                    type: ApplicationCommandOptionType.String,
                    description: 'The track title you want (you can put URL as you want)',
                    required: true
                }
            ],
        },
        {
            name: 'nowplaying',
            description: 'Get the current playing song!',
            type: 1,
        },
        {
            name: 'pause',
            description: 'Pause the current playing song!',
            type: 1,
        },
        {
            name: 'play',
            description: 'Play a song!',
            type: 1,
            options: [
                {
                    name: 'title',
                    type: ApplicationCommandOptionType.String,
                    description: 'The track title you want (you can put URL as you want)',
                    required: true
                }
            ],
        },
        {
            name: 'queue',
            description: 'Get the queue!',
            type: 1
        },
        {
            name: 'resume',
            description: 'Resume the current playing song!',
            type: 1,
        },
        {
            name: 'shuffle',
            description: 'Shuffle the queue!',
            type: 1,
        },
        {
            name: 'skip',
            description: 'Skip the current playing song!',
            type: 1,
        },
        {
            name: 'stop',
            description: 'Stop the current playing song!',
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
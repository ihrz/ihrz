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

const { QueueRepeatMode, QueryType } = require('discord-player');

const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require(`${process.cwd()}/files/ihorizonjs`);

module.exports = {
    "loop": {
        name: 'loop',
        description: 'Set loop mode of the guild!',
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
    "nowplaying": {
        name: 'nowplaying',
        description: 'Get the current playing song!',
    },
    "pause": {
        name: 'pause',
        description: 'Pause the current playing song!',
    },
    "play": {
        name: 'play',
        description: 'Play a song!',
        options: [
            {
                name: 'title',
                type: ApplicationCommandOptionType.String,
                description: 'The track title you want (you can put URL as you want)',
                required: true
            }
        ],
    },
    "lyrics": {
        name: 'lyrics',
        description: 'Find the lyrics of a title!',
        options: [
            {
                name: 'title',
                type: ApplicationCommandOptionType.String,
                description: 'The track title you want (you can put URL as you want)',
                required: true
            }
        ],
    },
    "queue": {
        name: 'queue',
        description: 'Get the queue!',
    },
    "resume": {
        name: 'resume',
        description: 'Resume the current playing song!',
    },
    "shuffle": {
        name: 'shuffle',
        description: 'Shuffle the queue!',
    },
    "skip": {
        name: 'skip',
        description: 'Skip the current playing song!',
    },
    "stop": {
        name: 'stop',
        description: 'Stop the current playing song!',
    },
};
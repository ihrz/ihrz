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
} = require('discord.js');

module.exports = {
    'avatar': {
        name: 'avatar',
        description: 'Get the avatar of a user!',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user',
                required: false
            }
        ],
    },
    'ban': {
        name: 'ban',
        description: 'Ban a user!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'the member you want to ban',
                required: true
            }
        ],
    },
    'clear': {
        name: 'clear',
        description: 'Clear a amount of message in the channel !',
        options: [
            {
                name: 'number',
                type: ApplicationCommandOptionType.Number,
                description: 'The number of message you want to delete !',
                required: true
            }
        ],
    },
    'kick': {
        name: 'kick',
        description: 'Kick a user!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'the member you want to kick',
                required: true
            }
        ],
    },
    'lock': {
        name: 'lock',
        description: 'Remove ability to speak of all users in this text channel!',
    },
    "lockall": {
        name: 'lockall',
        description: 'Remove ability to speak of all users in all channels!',
    },
    "tempmute": {
        name: 'tempmute',
        description: 'Temporarily mute a user!',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to unmuted',
                required: true
            },
            {
                name: 'time',
                type: ApplicationCommandOptionType.String,
                description: 'the duration of the user\'s tempmute',
                required: true
            }
        ],
    },
    "unban": {
        name: 'unban',
        description: 'Unban a user!',
        options: [
            {
                name: 'userid',
                type: ApplicationCommandOptionType.String,
                description: 'The id of the user you wan\'t to unban !',
                required: true
            },
            {
                name: 'reason',
                type: ApplicationCommandOptionType.String,
                description: 'The reason for unbanning this user.',
                required: false
            }

        ],
    },
    "unlock": {
        name: 'unlock',
        description: 'Give ability to speak of all users in this text!',
    },
    "unmute": {
        name: 'unmute',
        description: 'Unmute a user!',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to unmuted',
                required: true
            }
        ],
    },
}
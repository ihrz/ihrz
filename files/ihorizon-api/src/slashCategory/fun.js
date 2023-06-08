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
    "caracteres": {
        name: 'caracteres',
        description: 'Transform a string into a DarkSasuke!',
        options: [
            {
                name: 'nickname',
                type: ApplicationCommandOptionType.String,
                description: 'your cool nickname to transform !',
                required: true
            }
        ],
    },
    "cats": {
        name: 'cats',
        description: 'Get a picture of cat!',
    },
    "dogs": {
        name: 'dogs',
        description: 'Get a picture of dog!',
    },
    "hack": {
        name: 'hack',
        description: 'Hack a user!',
        options: [
            {
                name: "user",
                type: ApplicationCommandOptionType.User,
                description: "The user you want to hack",
                required: true
            }
        ],
    },
    "love": {
        name: 'love',
        description: 'Show your love compatibilty with the user!',
        options: [
            {
                name: "user1",
                type: ApplicationCommandOptionType.User,
                description: "The user you want to know you love's compatibilty",
                required: true
            },
            {
                name: "user2",
                type: ApplicationCommandOptionType.User,
                description: "The user you want to know you love's compatibilty",
                required: true
            }
        ],
    },
    "hug": {
        name: 'hug',
        description: 'Hug a user!',
        options: [
            {
                name: "user",
                type: ApplicationCommandOptionType.User,
                description: "The user you want to hug",
                required: true
            }
        ],
    },
    "kiss": {
        name: 'kiss',
        description: 'Kiss a user!',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to kiss',
                required: true
            }
        ],
    },
    "morse": {
        name: 'morse',
        description: 'Transform a string into a Morse!',
        options: [
            {
                name: 'input',
                type: ApplicationCommandOptionType.String,
                description: 'Enter your input to encrypt/decrypt in morse',
                required: true
            }
        ],
    },
    "poll": {
        name: 'poll',
        description: 'Create a poll!',
        options: [
            {
                name: 'message',
                type: ApplicationCommandOptionType.String,
                description: 'The message showed on the poll',
                required: true
            }
        ],
    },
    "question": {
        name: 'question',
        description: 'Ask a question to the bot !',
        options: [
            {
                name: 'question',
                type: ApplicationCommandOptionType.String,
                description: 'The question you want to give for the bot',
                required: true
            }
        ],
    },
    "slap": {
        name: 'slap',
        description: 'Slap a user!',
        options: [
            {
                name: "user",
                type: ApplicationCommandOptionType.User,
                description: "The user you want to slap",
                required: true
            }
        ],
    },
}
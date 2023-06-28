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
    "addinvites": {
        name: 'addinvites',
        description: 'Add invites to a user!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'the member you want to add invites',
                required: true
            },
            {
                name: 'amount',
                type: ApplicationCommandOptionType.Number,
                description: 'Number of invites you want to add',
                required: true
            }
        ],
    },
    "invites": {
        name: 'invites',
        description: 'Get the invites amount of a user!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'the member you want to show them invites',
                required: false
            }
        ],
    },
    "leaderboard": {
        name: 'leaderboard',
        description: 'Show the guild invites\'s leaderboard!',
    },
    "removeinvites": {
        name: 'removeinvites',
        description: 'Remove invites from a user!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'the member you want to remove invites',
                required: true
            },
            {
                name: 'amount',
                type: ApplicationCommandOptionType.Number,
                description: 'Number of invites you want to substract',
                required: true
            }
        ],
    },
}
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
    'addmoney': {
        name: 'addmoney',
        description: 'Add money to a user!',
        options: [
            {
                name: 'amount',
                type: ApplicationCommandOptionType.Number,
                description: 'The amount of money you want to add',
                required: true
            },
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'The member who you want to add money',
                required: true
            }
        ],
    },
    'balance': {
        name: 'balance',
        description: 'Get the balance of a user!',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'Target a user for see their current balance or keep blank for yourself',
                required: false
            }
        ],
    },
    'daily': {
        name: 'daily',
        description: 'Claim a daily reward!',
    },
    'monthly': {
        name: 'monthly',
        description: 'Claim a monthly reward!',
    },
    'pay': {
        name: 'pay',
        description: 'Pay a user a certain amount!',
        options: [
            {
                name: 'amount',
                type: ApplicationCommandOptionType.Number,
                description: 'The amount of money you want to donate to them',
                required: true
            },
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'The member you want to donate the money',
                required: true
            }
        ],
    },
    'removemoney': {
        name: 'removemoney',
        description: 'Remove money from a user!',
        options: [
            {
                name: 'amount',
                type: ApplicationCommandOptionType.Number,
                description: 'amount of $ you want add',
                required: true
            },
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'the member you want to add the money',
                required: true
            }
        ],
    },
    'rob': {
        name: 'rob',
        description: 'Rob a user!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'the member you want to rob a money',
                required: true
            }
        ],
    },
    "weekly": {
        name: 'weekly',
        description: 'Claim a weekly reward!',
    },
    "work": {
        name: 'work',
        description: 'Claim a work reward!',
    },
}
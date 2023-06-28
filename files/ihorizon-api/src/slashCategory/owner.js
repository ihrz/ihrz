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
    "blacklist": {
        name: 'blacklist',
        description: 'Add a user to the blacklist!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to blacklist...',
                required: false
            },
            {
                name: 'forceid',
                type: ApplicationCommandOptionType.String,
                description: 'The user you want to blacklist...',
                required: false
            }
        ],
    },
    "eval": {
        name: 'eval',
        description: 'Run Javascript program (only for developers)!',
        options: [
            {
                name: 'code',
                type: ApplicationCommandOptionType.String,
                description: 'javascript code',
                required: true
            }
        ],
    },
    "owner": {
        name: 'owner',
        description: 'add user to owner list (can\'t be used by normal member)!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'The member you want to made owner of the iHorizon Projects',
                required: false
            }
        ],
    },
    "unblacklist": {
        name: 'unblacklist',
        description: 'The user you want to unblacklist (Only Owner of ihorizon)!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to unblacklist (Only Owner of ihorizon)',
                required: true
            }
        ],
    },
    "unowner": {
        name: 'unowner',
        description: 'The member who wants to delete of the owner list (Only Owner of ihorizon)!',
        options: [
            {
                name: 'member',
                type: ApplicationCommandOptionType.User,
                description: 'The member who wants to delete of the owner list',
                required: false
            },
            {
                name: 'userid',
                type: ApplicationCommandOptionType.String,
                description: 'The member who wants to delete of the owner list',
                required: false
            }
        ],
    },
}
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
    'guildinfo': {
        name: 'guildinfo',
        description: 'Get information about the server!',
    },
    "prevnames": {
        name: 'prevnames',
        description: 'Lookup an Discord User, and see this previous username !',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'user you want to lookup',
                required: true
            }
        ],
    },
    'renew': {
        name: 'renew',
        description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent',
    },
    'setmentionrole': {
        name: 'setmentionrole',
        description: 'Set a mention roles when user mention someone!',
        options: [
            {
                name: 'action',
                type: ApplicationCommandOptionType.String,
                description: 'What you want to do?',
                required: true,
                choices: [
                    {
                        name: "Power Off",
                        value: "off"
                    },
                    {
                        name: 'Power On',
                        value: "on"
                    }
                ],
            },
            {
                name: 'roles',
                type: ApplicationCommandOptionType.Role,
                description: 'The specific roles to give !',
                required: false
            }
        ],
    },
    'snipe': {
        name: 'snipe',
        description: 'Get the last message deleted in this channel!',
    },
    'userinfo': {
        name: 'userinfo',
        description: 'Get information about a user!',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'user you want to lookup',
                required: false
            }
        ],
    },
};
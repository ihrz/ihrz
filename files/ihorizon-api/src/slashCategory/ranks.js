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
    "disablexp": {
        name: 'disablexp',
        description: "Disable the message when user earn new xp level message!",
        options: [
            {
                name: 'action',
                type: ApplicationCommandOptionType.String,
                description: 'What you want to do?',
                required: true,
                choices: [
                    {
                        name: "Remove the module (don't send any message but user still earn xp level)",
                        value: "off"
                    },
                    {
                        name: 'Power on the module (send message when user earn xp level)',
                        value: "on"
                    },
                ],
            },
        ],
    },
    "setxpchannel": {
        name: 'setxpchannel',
        description: "Set the channel where user earn new xp level message!",
        options: [
            {
                name: 'action',
                type: ApplicationCommandOptionType.String,
                description: 'What you want to do?',
                required: true,
                choices: [
                    {
                        name: "Remove the module (send xp message on the user's message channel)",
                        value: "off"
                    },
                    {
                        name: 'Power on the module (send xp message on a specific channel)',
                        value: "on"
                    }
                ],
            },
            {
                name: 'channel',
                type: ApplicationCommandOptionType.Channel,
                description: 'The specific channel for xp message !',
                required: false
            }
        ],
    },
    "level": {
        name: 'level',
        description: "Get the user's xp level!",
        options: [
            {
              name: 'user',
              type: ApplicationCommandOptionType.User,
              description: 'The user you want to lookup, keep blank if you want to show your stats',
              required: false
            }
          ],
    },
    "xpleaderboard": {
        name: 'xpleaderboard',
        description: "Get the xp's leaderboard of the guild!",
    },
};
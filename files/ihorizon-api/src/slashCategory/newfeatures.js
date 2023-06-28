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
    "embed": {
        name: 'embed',
        description: 'Create a beautiful embed !',
        options: [
            {
                name: 'id',
                type: ApplicationCommandOptionType.String,
                description: 'If you have a embed\'s ID !',
                required: false,
            }
        ],
    },
    "punishpub": {
        name: 'punishpub',
        description: 'Punish user when he send too much advertisement!',
        options: [
            {
                name: 'action',
                type: ApplicationCommandOptionType.String,
                description: 'Choose the action',
                required: true,
                choices: [
                    {
                        name: "POWER ON",
                        value: "true"
                    },
                    {
                        name: "POWER OFF",
                        value: "false"
                    }
                ]
            },
            {
                name: 'amount',
                type: ApplicationCommandOptionType.Number,
                description: 'The max amount of flags before punishement',
                required: false,
            },
            {
                name: 'punishement',
                type: ApplicationCommandOptionType.String,
                description: 'Choose the punishement',
                required: false,
                choices: [
                    {
                        name: "BAN",
                        value: "ban"
                    },
                    {
                        name: "KICK",
                        value: "kick"
                    },
                    {
                        name: "MUTE",
                        value: "mute"
                    }
                ]
            }
        ],
    },
    "report": {
        name: 'report',
        description: 'Report a bug, error, spell error to the iHorizon\'s dev!',
        options: [
            {
                name: 'message-to-dev',
                type: ApplicationCommandOptionType.String,
                description: 'What is the problem? Please make a good sentences',
                required: true
            }
        ],
    },
    "setlogschannel": {
        name: 'setlogschannel',
        description: 'Set a logs channels for Audits Logs!',
        options: [
            {
                name: 'type',
                type: ApplicationCommandOptionType.String,
                description: 'Specified logs category',
                required: true,
                choices: [
                    { name: "Delete all settings", value: "off" },
                    { name: "Roles Logs", value: "1" },
                    { name: "Moderation Logs", value: "2" },
                    { name: "Voice Logs", value: "3" },
                    { name: "Messages Logs", value: "4" }]
            },
            {
                name: 'channel',
                type: ApplicationCommandOptionType.Channel,
                description: "The channel you wan't your logs message !",
                required: false
            }
        ],
    },
    "support": {
        name: 'support',
        description: 'Give a roles when guild\'s member have something about your server on them bio!',
        options: [
            {
                name: 'action',
                type: ApplicationCommandOptionType.String,
                description: 'Choose the action',
                required: true,
                choices: [
                    {
                        name: "POWER ON",
                        value: "true"
                    },
                    {
                        name: "POWER OFF",
                        value: "false"
                    }
                ]
            },
            {
                name: 'input',
                type: ApplicationCommandOptionType.String,
                description: 'Choose the keywords wanted in the bio',
                required: false,
            },
            {
                name: 'roles',
                type: ApplicationCommandOptionType.Role,
                description: 'The wanted roles to give for your member',
                required: false,
            }
        ],
    },
}
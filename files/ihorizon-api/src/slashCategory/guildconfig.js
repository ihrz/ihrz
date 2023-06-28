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
    "blockpub": {
        name: 'blockpub',
        description: 'Allow/Unallow the user to send a advertisement into them messages!',
        options: [
            {
                name: 'action',
                type: ApplicationCommandOptionType.String,
                description: 'What you want to do?',
                required: true,
                choices: [
                    {
                        name: "Disable the spam protection",
                        value: "off"
                    },
                    {
                        name: 'Enable the spam protection',
                        value: "on"
                    },
                ],
            },
        ],
    },
    "guildconfig": {
        name: 'guildconfig',
        description: 'Get the guild configuration!',
    },
    "setchannel": {
        name: 'setchannel',
        description: 'Set the channel where the bot will send message when user leave/join guild!',
        options: [
            {
                name: 'type',
                type: ApplicationCommandOptionType.String,
                description: '<On join/On leave/Delete all settings>',
                required: true,
                choices: [
                    {
                        name: "On join",
                        value: "join"
                    },
                    {
                        name: "On leave",
                        value: "leave"
                    },
                    {
                        name: "Delete all settings",
                        value: "off"
                    }
                ]
            },
            {
                name: 'channel',
                type: ApplicationCommandOptionType.Channel,
                description: "The channel you wan't your welcome/goodbye message !",
                required: false
            }
        ],
    },
    "setjoindm": {
        name: 'setjoindm',
        description: 'Set a join dm message when user join the guild!',
        options: [
            {
                name: "value",
                description: "Choose the action you want to do",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: "Power on",
                        value: "on"
                    },
                    {
                        name: "Power off",
                        value: "off"
                    },
                    {
                        name: "Show the message set",
                        value: "ls"
                    }
                ]
            },
            {
                name: 'message',
                type: ApplicationCommandOptionType.String,
                description: '<Message if the first args is on>',
                required: false
            }
        ],
    },
    "setjoinmessage": {
        name: 'setjoinmessage',
        description: 'Set a join message when user join the guild!',
        options: [
            {
                name: "value",
                description: "<Power on /Power off/Show the message set>",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: "Power on",
                        value: "on"
                    },
                    {
                        name: "Power off",
                        value: "off"
                    },
                    {
                        name: "Show the message set",
                        value: "ls"
                    },
                    {
                        name: "Need help",
                        value: "needhelp"
                    }
                ]
            },
            {
                name: 'message',
                type: ApplicationCommandOptionType.String,
                description: `{user}:username| {membercount}:guild member count| {createdat}:user create date| {guild}:Guild name`
            },
        ],
    },
    "setjoinrole": {
        name: 'setjoinrole',
        description: 'Set a join roles when user join the guild!',
        options: [
            {
                name: "value",
                description: "<Power on /Power off/Show the message set>",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: "Power on",
                        value: "true"
                    },
                    {
                        name: "Power off",
                        value: "false"
                    },
                    {
                        name: "Show the roles set",
                        value: "ls"
                    },
                    {
                        name: "Need help",
                        value: "needhelp"
                    }
                ]
            },
            {
                name: 'roles',
                type: ApplicationCommandOptionType.Role,
                description: '<roles id>',
                required: false
            }
        ],
    },
    "setleavemessage": {
        name: 'setleavemessage',
        description: 'Set a leave message when user leave the guild!',
        options: [
            {
                name: "value",
                description: "<Power on /Power off/Show the message set>",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: "Power on",
                        value: "on"
                    },
                    {
                        name: "Power off",
                        value: "off"
                    },
                    {
                        name: "Show the message set",
                        value: "ls"
                    },
                    {
                        name: "Need help",
                        value: "needhelp"
                    }
                ]
            },
            {
                name: 'message',
                type: ApplicationCommandOptionType.String,
                description: `{user} = Username of Member | {membercount} = guild's member count | {guild} = The name of the guild`,
                required: false
            },
        ],
    },
    "setup": {
        name: 'setup',
        description: 'Setup the logs channel about the bot!',
    },
}
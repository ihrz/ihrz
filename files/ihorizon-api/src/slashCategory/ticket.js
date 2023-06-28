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
    "add": {
        name: "add",
        description: "Add a member into your ticket!",
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to add into your ticket',
                required: true
            }
        ],
    },
    "close": {
        name: "close",
        description: "Close a ticket!",
    },
    'delete': {
        name: "delete",
        description: "Delete a iHorizon ticket!",
    },
    'disableticket': {
        name: "disableticket",
        description: "Disable ticket commands on a guild!",
        options: [
            {
                name: 'action',
                type: ApplicationCommandOptionType.String,
                description: 'What you want to do?',
                required: true,
                choices: [
                    {
                        name: "Remove the module",
                        value: "off"
                    },
                    {
                        name: 'Power on the module',
                        value: "on"
                    },
                ],
            },
        ],
    },
    'open': {
        name: "open",
        description: "re-open a closed ticket!",
    },
    'remove': {
        name: 'remove',
        description: "Remove a member from your ticket!",
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to remove into your ticket',
                required: true
            }
        ],    
    },
    'sethereticket': {
        name: "sethereticket",
        description: "Make a embed for allowing to user to create a ticket!",
        options: [
            {
                name: "name",
                description: "The name of you ticket's panel.",
                type: ApplicationCommandOptionType.String,
                required: true,
            }
        ],
    },
    'transcript': {
        name: "transcript",
        description: "Get the transript of a ticket message!",
    },
}
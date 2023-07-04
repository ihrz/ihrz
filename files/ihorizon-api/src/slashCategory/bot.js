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
    "botinfo": {
        name: 'botinfo',
        description: 'Get information about the bot!',
    },
    "help": {
        name: 'help',
        description: 'Get a list of all the commands!',
    },
    "invite": {
        name: 'invite',
        description: 'Get the bot invite link!',
    },
    "kisakay": {
        name: 'kisakay',
        description: 'Get necessary information about my developer, Kisakay',
    },
    "ping": {
        name: 'ping',
        description: 'Get the bot latency!',
    },
    "setserverlang": {
        name: 'setserverlang',
        description: 'Set the server language!',
        options: [
            {
                name: 'language',
                type: ApplicationCommandOptionType.String,
                description: 'What language you want ? (soon more)',
                required: true,
                choices: [
                    {
                        name: "Deutsch",
                        value: "de-DE"
                    },
                    {
                        name: "English",
                        value: "en-US"
                    },
                    {
                        name: "French",
                        value: "fr-FR"
                    },
                    {
                        name: "Italian",
                        value: "it-IT"
                    },
                    {
                        name: "Japanese",
                        value: "jp-JP"
                    },
                    {
                        name: "Spanish",
                        value: "es-ES"
                    }/*,
                        {
                            name: "Norwegian",
                            value: "no-NO"
                        }*/
                ],
            }
        ],
    },
    "status": {
        name: 'status',
        description: 'Get the bot status! (Only for the bot owner)',
    },
}
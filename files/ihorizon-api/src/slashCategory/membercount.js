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
    "membercount": {
        name: 'membercount',
        description: 'Set a member count channels!',
        options: [
            {
                name: "action",
                description: "<Power on /Power off>",
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
                ]
            },
            {
                name: "channel",
                description: `The channel to set the member count`,
                type: ApplicationCommandOptionType.Channel,
                required: true,
            },
            {
                name: 'name',
                required: false,
                type: ApplicationCommandOptionType.String,
                description: `{botcount}, {rolescount}, {membercount}`
            },
        ],
    },
}
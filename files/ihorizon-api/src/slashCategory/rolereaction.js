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
    "rolereaction": {
        name: 'rolereaction',
        description: 'Set a roles when user react to a message with specific emoji',
        options: [
            {
                name: "value",
                description: "Please make your choice.",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: "Add another",
                        value: "add"
                    },
                    {
                        name: "Remove one",
                        value: "remove"
                    }
                ]
            },
            {
                name: 'messageid',
                type: ApplicationCommandOptionType.String,
                description: `Please copy the identifiant of the message you want to configure`,
                required: true
            },
            {
                name: 'reaction',
                type: ApplicationCommandOptionType.String,
                description: `The emoji you want`,
                required: false
            },
            {
                name: 'role',
                type: ApplicationCommandOptionType.Role,
                description: `The role you want to configure`,
                required: false
            }
        ],
    },
};
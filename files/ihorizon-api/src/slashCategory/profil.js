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
    "profil": {
        name: "profil",
        description: "See them iHorizon's profile!",
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user you wan\'t to lookup',
                required: false
            }
        ],
    },
    "setprofilage": {
        name: "setprofilage",
        description: "Set your age on the iHorizon Profil !",
        options: [
            {
                name: 'age',
                type: ApplicationCommandOptionType.Number,
                description: 'you age on the iHorizon profil',
                required: true
            }
        ],
    },
    "setprofildescription": {
        name: "setprofildescription",
        description: "Set your description on the iHorizon Profil!",
        options: [
            {
                name: 'descriptions',
                type: ApplicationCommandOptionType.String,
                description: 'you descriptions on the iHorizon profil',
                required: true
            }
        ],
    },
    "setprofilgender": {
        name: "setprofilgender",
        description: 'Set your gender on the iHorizon Profil!',
        options: [
            {
                name: "gender",
                description: "Please make your choice.",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    {
                        name: "♀️ Female",
                        value: "♀️ Female"
                    },
                    {
                        name: "♂️ Male",
                        value: "♂️ Male"
                    },
                    {
                        name: "⚧️ Other",
                        value: "⚧️ Other"
                    }
                ]
            },
        ],
    },
};
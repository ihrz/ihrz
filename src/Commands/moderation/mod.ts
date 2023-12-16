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

import {
    Client,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: "mod",
    description: "Subcommand for moderation category!",
    options: [
        {
            name: "avatar",
            description: "Pick the avatar of a user!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user',
                    required: false
                }
            ],
        },
        {
            name: 'ban',
            description: 'Ban a user!',
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to ban',
                    required: true
                }
            ],
        },
        {
            name: 'clear',
            description: 'Clear a amount of message in the channel !',
            type: 1,
            options: [
                {
                    name: 'number',
                    type: ApplicationCommandOptionType.Number,
                    description: 'The number of message you want to delete !',
                    required: true
                }
            ],
        },
        {
            name: 'kick',
            description: 'Kick a user!',
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to kick',
                    required: true
                }
            ],
        },
        {
            name: 'lock',
            description: 'Remove ability to speak of all users in this text channel!',
            type: 1,
        },
        {
            name: 'lock-all',
            description: 'Remove ability to speak of all users in all channels!',
            type: 1
        },
        {
            name: 'tempmute',
            description: 'Temporarily mute a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to unmuted',
                    required: true
                },
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,
                    description: 'the duration of the user\'s tempmute',
                    required: true
                }
            ],
        },
        {
            name: 'unban',
            description: 'Unban a user!',
            type: 1,
            options: [
                {
                    name: 'userid',
                    type: ApplicationCommandOptionType.String,
                    description: 'The id of the user you wan\'t to unban !',
                    required: true
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,
                    description: 'The reason for unbanning this user.',
                    required: false
                }
            ],
        },
        {
            name: 'unlock',
            description: 'Give ability to speak of all users in this text!',
            type: 1
        },
        {
            name: 'unmute',
            description: 'Unmute a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to unmuted',
                    required: true
                }
            ],
        }
    ],
    thinking: true,
    category: 'moderation',
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
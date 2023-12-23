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
    ApplicationCommandType,
} from 'discord.js';

import { Command } from '../../../../types/command';

export const command: Command = {
    name: "suggest",
    description: "Subcommand for suggestion category!",
    options: [
        {
            name: "reply",
            description: "Reply to the suggestion (need admin permission)!",
            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,
                    description: 'What the id of the suggestion?',
                    required: true,
                },
                {
                    name: 'message',
                    type: ApplicationCommandOptionType.String,
                    description: 'What message you want reply?',
                    required: true,
                },
            ],
        },
        {
            name: "deny",
            description: "Deny an suggestion (need admin permission)!",
            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,
                    description: 'What the id of the suggestion?',
                    required: true,
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,
                    description: 'What reason for you denying ?',
                    required: true,
                },
            ],
        },
        {
            name: "accept",
            description: "Accept an suggestion (need admin permission)!",
            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,
                    description: 'What the id of the suggestion?',
                    required: true,
                },
                {
                    name: 'reason',
                    type: ApplicationCommandOptionType.String,
                    description: 'What reason for you accepting ?',
                    required: true,
                },
            ],
        },
        {
            name: "delete",
            description: "Delete an suggestion (need admin permission)!",
            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,
                    description: 'What the id of the suggestion?',
                    required: true,
                },
            ],
        },
    ],
    category: 'suggestion',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
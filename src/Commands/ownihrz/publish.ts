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
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: "publish",
    description: "Host your own iHorizon!",
    options: [
        {
            name: "submit",
            description: "Submit for the creation of your own iHorizon!",
            type: 1,
            options: [
                {
                    name: 'discord_bot_token',
                    type: ApplicationCommandOptionType.String,
                    description: 'The token of your discord bot!',
                    required: true
                },
                {
                    name: 'owner_two',
                    type: ApplicationCommandOptionType.User,
                    description: 'The second owner of your own discord bot!',
                    required: false
                }
            ],
        },
        {
            name: "list",
            description: "List your bot",
            type: 1,
        },
        {
            name: "accept",
            description: "Only for owner",
            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,
                    description: 'The id of the bot to accept their host!',
                    required: true
                }
            ],
        },
        {
            name: "deny",
            description: "Only for owner",
            type: 1,
            options: [
                {
                    name: 'id',
                    type: ApplicationCommandOptionType.String,
                    description: 'The id of the bot to deny their host!',
                    required: true
                }
            ],
        }
    ],
    category: 'ownihrz',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
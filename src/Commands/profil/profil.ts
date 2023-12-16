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
    name: "profil",
    description: "Subcommand for profil category!",
    options: [
        {
            name: "show",
            description: "See the iHorizon's profile of the member!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you wan\'t to lookup',
                    required: false
                }
            ],
        },
        {
            name: "set-age",
            description: "Set your age on the iHorizon Profil !",
            type: 1,
            options: [
                {
                    name: 'age',
                    type: ApplicationCommandOptionType.Number,
                    description: 'you age on the iHorizon profil',
                    required: true
                }
            ],
        },
        {
            name: "set-description",
            description: "Set your description on the iHorizon Profil!",
            type: 1,
            options: [
                {
                    name: 'descriptions',
                    type: ApplicationCommandOptionType.String,
                    description: 'you descriptions on the iHorizon profil',
                    required: true
                }
            ],
        },
        {
            name: "set-gender",
            description: "Set your gender on the iHorizon Profil!",
            type: 1,
            options: [
                {
                    name: 'gender',
                    type: ApplicationCommandOptionType.String,
                    description: "Please make your choice.",
                    required: true,
                    choices: [
                        {
                            name: "♀ Female",
                            value: "♀️ Female"
                        },
                        {
                            name: "♂ Male",
                            value: "♂️ Male"
                        },
                        {
                            name: "🚻 Other",
                            value: "⚧️ Other"
                        }
                    ]
                }
            ],
        }
    ],
    thinking: false,
    category: 'profil',
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
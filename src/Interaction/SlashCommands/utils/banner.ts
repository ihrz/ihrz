/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    Client,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    
    name: 'banner',

    description: 'Pick the banner of specified things (Server/User)',
    description_localizations: {
        "fr": "Récuperer la bannière des éléments spécifiés (serveur/utilisateur)"
    },

    category: 'utils',
    options: [
        {
            name: "user",

            description: "Get the banner of a specified user!",
            description_localizations: {
                "fr": "Récuperer la bannière des éléments spécifiés (serveur/utilisateur)"
            },

            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'What the user then?',
                    description_localizations: {
                        "fr": "Qu'est-ce que l'utilisateur alors ?"
                    },

                    required: false,
                },
            ],
        },
        {
            name: "server",

            description: "Get the banner of the server!",
            description_localizations: {
                "fr": "Récupérer la bannière du serveur"
            },

            type: 1,
        },
    ],
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
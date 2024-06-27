/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

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
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType,
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: "setsuggest",

    description: "Subcommand for suggestion category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de suggestion"
    },

    options: [
        {
            name: "disable",

            description: "Disable the suggestion module (need admin permission)!",
            description_localizations: {
                "fr": "Désactivez le module de suggestion (besoin de l'autorisation de l'administrateur)"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,

                    description: 'What you want to do ?',
                    description_localizations: {
                        "fr": "Que veux-tu faire ?"
                    },

                    required: true,
                    choices: [
                        {
                            name: 'Power On the Suggestion Module',
                            value: 'on'
                        },
                        {
                            name: 'Power Off the Suggestion Module',
                            value: 'off'
                        },
                    ]
                },
            ],
        },
        {
            name: "channel",

            description: "Set a channel for the Suggestion Module (need admin permission)!",
            description_localizations: {
                "fr": "Définir un canal pour le module de suggestion (nécessite une autorisation d'administrateur)"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    type: ApplicationCommandOptionType.Channel,

                    description: 'What the channel for the suggestion place?',
                    description_localizations: {
                        "fr": "Quel est le channel pour le lieu de suggestion ?"
                    },

                    required: true,
                },
            ],
        },
    ],
    thinking: false,
    category: 'suggestion',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
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
    ChatInputCommandInteraction,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: "antispam",

    description: "Subcommand for antispam category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie d'antispam"
    },

    options: [
        {
            name: "manage",

            description: "Manage the antispam module",
            description_localizations: {
                "fr": "Gérer le module antispam"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "bypass-roles",

            description: "All of the roles wich bypass the antispam",
            description_localizations: {
                "fr": "Tous les rôles qui contournent l'anti spam"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
    category: 'antispam',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
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
    name: "allowlist",

    description: "Subcommand for protection category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de protection"
    },

    options: [
        {
            name: "list",

            description: "Make action about the allowlist",
            description_localizations: {
                "fr": "Prendre des mesures concernant la liste blanche"
            },

            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "add",

                    description: "Adding an user in the allowlist!",
                    description_localizations: {
                        "fr": "Ajouter un utilisateur à la liste blanche"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'member',
                            type: ApplicationCommandOptionType.User,

                            description: 'Whats is the member then?',
                            description_localizations: {
                                "fr": "Quel est le membre alors?"
                            },

                            required: true
                        },
                    ],
                },
                {
                    name: "remove",

                    description: "Removing an user in the allowlist!",
                    description_localizations: {
                        "fr": "Supprimer un utilisateur de la liste blanche"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'member',
                            type: ApplicationCommandOptionType.User,

                            description: 'Whats is the member then?',
                            description_localizations: {
                                "fr": "Quel est le membre alors?"
                            },

                            required: true
                        },
                    ],
                },
                {
                    name: "show",

                    description: "List the users in the allowlist!",
                    description_localizations: {
                        "fr": "Lister les utilisateurs dans la liste autorisée"
                    },

                    type: ApplicationCommandOptionType.Subcommand,
                },
            ],
        },
    ],
    thinking: false,
    category: 'protection',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
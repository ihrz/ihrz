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
    name: "backup",
    
    description: "Subcommand for backup category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie backup"
    },
    
    options: [
        {
            name: "create",
            name_localizations: {
                "fr": "créer"
            },

            description: "Create a backup!",
            description_localizations: {
                "fr": "Créer une backup"
            },

            type: 1,
            options: [
                {
                    name: 'save-message',
                    type: ApplicationCommandOptionType.Boolean,

                    description: 'Do you want to save message(s) ?',
                    description_localizations: {
                        "fr": "Voulez-vous sauvegarder des message(s) ?"
                    },

                    required: true,
                },
            ],
        },
        {
            name: "list",
            name_localizations: {
                "fr": "listé"
            },

            description: "List your backup(s)!",
            description_localizations: {
                "fr": "Listé toute vos backup(s)"
            },

            type: 1,
        },
        {
            name: "load",
            name_localizations: {
                "fr": "chargé"
            },

            description: "Load your backup to initialize!",
            description_localizations: {
                "fr": "Charger une de vos backup(s)"
            },

            type: 1,
            options: [
                {
                    name: 'backup-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'Whats is the backup id?',
                    description_localizations: {
                        "fr": "Quelle est l'identifiant de la backup ?"
                    },

                    required: false
                },
            ],
        },
    ],
    category: 'backup',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let command = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
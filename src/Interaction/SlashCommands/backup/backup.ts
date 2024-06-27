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

            type: ApplicationCommandOptionType.Subcommand,
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

            type: ApplicationCommandOptionType.Subcommand,
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

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'backup-id',
                    type: ApplicationCommandOptionType.String,

                    description: 'Whats is the backup id?',
                    description_localizations: {
                        "fr": "Quelle est l'identifiant de la backup ?"
                    },

                    required: true
                },
            ],
        },
        {
            name: "delete",
            
            description: "Delete your backup from the list",
            description_localizations: {
                "fr": "Supprimer une backup de la liste"
            },

            options: [
                {
                    name: "backup-id",
                    
                    description: "The ID of your backup you want to delete from the list",
                    description_localizations: {
                        "fr": "L'identifiant de la backup que vous voulez supprimer de la liste"
                    },

                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ],
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    category: 'backup',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let command = interaction.options.getSubcommand();

        const commandModule = await import(`./!${command}.js`);
        await commandModule.default.run(client, interaction, data);
    },
};
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
    Message,
    EmbedBuilder,
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: "invites",
    description: "Subcommand for invites manager category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie d'InviteManager"
    },
    options: [
        {
            name: "addinvites",
            aliases: ["add", "a"],

            description: "Add invites to a user!",
            description_localizations: {
                "fr": "Ajouter des invitations à un utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,

                    description: 'the member you want to add invites',
                    description_localizations: {
                        "fr": "le membre auquel vous souhaitez ajouter des invitations"
                    },

                    required: true
                },
                {
                    name: 'amount',
                    type: ApplicationCommandOptionType.Number,

                    description: 'Number of invites you want to add',
                    description_localizations: {
                        "fr": "Nombre d'invitations que vous souhaitez ajouter"
                    },

                    required: true
                }
            ],
        },
        {
            name: 'leaderboard',
            aliases: ["lb"],

            description: 'Show the guild invites\'s leaderboard!',
            description_localizations: {
                "fr": "Afficher le classement des invitations du serveur"
            },

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "show",

            description: "Get the invites amount of a user!",
            description_localizations: {
                "fr": "Obtenez le montant des invitations d'un utilisateur"
            },

            aliases: ["me", "sh", "see"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,

                    description: 'the member you want to show them invites',
                    description_localizations: {
                        "fr": "le membre où souhaitez voir ces invitations"
                    },

                    required: false
                }
            ],
        },
        {
            name: 'removeinvites',
            aliases: ["remove", "sub"],

            description: 'Remove invites from a user!',
            description_localizations: {
                "fr": "Supprimer les invitations d'un utilisateur"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,

                    description: 'the member you want to remove invites',
                    description_localizations: {
                        "fr": "le membre où vous souhaitez supprimer ces invites"
                    },

                    required: true
                },
                {
                    name: 'amount',
                    type: ApplicationCommandOptionType.Number,

                    description: 'Number of invites you want to substract',
                    description_localizations: {
                        "fr": "Nombre d'invitations que vous souhaitez soustraire"
                    },

                    required: true
                }
            ],
        }
    ],
    thinking: true,
    category: 'invitemanager',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, execTimestamp: number, options?: string[]) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let fetchedCommand;

        if (interaction instanceof ChatInputCommandInteraction) {
            fetchedCommand = interaction.options.getSubcommand();
        } else {
            if (!options?.[0]) {
                let embed = await client.func.arg.createAwesomeEmbed(command, client, interaction);
                await interaction.reply({ embeds: [embed] })
                return;
            };
            let cmd = command.options?.find(x => options[0] === x.name || x.aliases?.includes(options[0]));
            if (!cmd) return;

            fetchedCommand = cmd.name;
            options.shift();
        }

        const commandModule = await import(`./!${fetchedCommand}.js`);
        await commandModule.default.run(client, interaction, data, execTimestamp, options);
    },
};
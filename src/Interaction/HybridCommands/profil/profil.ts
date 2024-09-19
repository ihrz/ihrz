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
} from 'discord.js';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

import { SubCommandArgumentValue } from '../../../core/functions/method';
export const command: Command = {
    name: "profil",

    description: "Subcommand for profil category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie de visualisation profil"
    },

    options: [
        {
            name: "show",
            name_localizations: {
                "fr": "afficher"
            },

            description: "See the iHorizon's profil of the member!",
            description_localizations: {
                "fr": "Voir le profil iHorizon du membre"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,

                    description: 'The user you want to lookup',
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez rechercher"
                    },

                    required: false
                }
            ],
        },
        {
            name: "set-age",
            name_localizations: {
                "fr": "définir-âge"
            },

            description: "Set your age on the iHorizon's Profil !",
            description_localizations: {
                "fr": "Définissez votre âge sur le profil iHorizon"
            },

            aliases: ["age"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'age',
                    type: ApplicationCommandOptionType.Number,

                    description: "Your age on the iHorizon's profil",
                    description_localizations: {
                        "fr": "Votre âge sur votre profil iHorizon"
                    },

                    required: true
                }
            ],
        },
        {
            name: "set-description",
            name_localizations: {
                "fr": "définir-description"
            },

            description: "Set your description on the iHorizon's Profil!",
            description_localizations: {
                "fr": "Définissez votre description sur le profil iHorizon"
            },

            aliases: ["desc", "description"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'description',
                    type: ApplicationCommandOptionType.String,

                    description: "Your descriptions on the iHorizon's profil",
                    description_localizations: {
                        "fr": "La description sur votre profil"
                    },

                    required: true
                }
            ],
        },
        {
            name: "set-gender",
            name_localizations: {
                "fr": "définir-genre"
            },

            description: "Set your gender on the iHorizon's Profil!",
            description_localizations: {
                "fr": "Définissez votre sexe sur le profil iHorizon"
            },

            aliases: ["gender"],

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'gender',
                    type: ApplicationCommandOptionType.String,

                    description: "Faite votre choix",
                    description_localizations: {
                        "fr": "L'utilisateur que vous souhaitez rechercher"
                    },

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
    integration_types: [0, 1],
    contexts: [0, 1, 2],

    thinking: false,
    category: 'profil',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, runningCommand: SubCommandArgumentValue, execTimestamp?: number, options?: string[]) => {
        let fetchedCommand: string;
        let sub: SubCommandArgumentValue | undefined;

        if (interaction instanceof ChatInputCommandInteraction) {
            fetchedCommand = interaction.options.getSubcommand();
            sub = { name: command.name, command: command.options?.find(x => fetchedCommand === x.name) }
        } else {
            if (!options?.[0]) {
                await client.method.interactionSend(interaction, { embeds: [await client.method.createAwesomeEmbed(lang, command, client, interaction)] });
                return;
            }
            const cmd = command.options?.find(x => options[0] === x.name || x.aliases?.includes(options[0]));
            sub = { name: command.name, command: cmd };
            if (!cmd) return;

            fetchedCommand = cmd.name;
            options.shift();
        }

        const commandModule = await import(`./!${fetchedCommand}.js`);
        await commandModule.default.run(client, interaction, lang, sub, execTimestamp, options);
    },
};
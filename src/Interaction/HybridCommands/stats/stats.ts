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
import { SubCommandArgumentValue } from '../../../core/functions/method'; export const command: Command = {
    name: "stats",
    description: "Subcommand for stats category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour la catégorie des statistique des utilisateurs!"
    },

    options: [
        {
            name: "ustats",

            description: "See profil",
            description_localizations: {
                fr: "Regarder un profil"
            },

            options: [
                {
                    name: "member",

                    description: "The member you want",
                    description_localizations: {
                        fr: "L'utilisateur que vous souhaiter"
                    },

                    type: ApplicationCommandOptionType.User,
                    required: false
                }
            ],

            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: "gstats",

            description: "See guild leaderboard",
            description_localizations: {
                fr: "Regarder le classement du serveur"
            },

            type: ApplicationCommandOptionType.Subcommand
        },
        // {
        //     name: "reset",

        //     description: "Reset profil",
        //     description_localizations: {
        //         fr: "Réintialiser un profil"
        //     },

        //     options: [
        //         {
        //             name: "member",

        //             description: "The member you want",
        //             description_localizations: {
        //                 fr: "L'utilisateur que vous souhaiter"
        //             },

        //             type: ApplicationCommandOptionType.String,
        //             required: false
        //         }
        //     ],

        //     type: ApplicationCommandOptionType.Subcommand,
        // },
    ],

    thinking: true,
    category: 'stats',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, runningCommand: SubCommandArgumentValue, execTimestamp?: number, options?: string[]) => {
        let fetchedCommand;
        let sub: SubCommandArgumentValue | undefined;

        if (interaction instanceof ChatInputCommandInteraction) {
            fetchedCommand = interaction.options.getSubcommand();
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
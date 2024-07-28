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
    ChannelType,
} from 'discord.js';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';

export const command: Command = {
    name: "pfps",

    description: "Sending random user avatar in channel!",
    description_localizations: {
        "fr": "Envoi d'un avatar d'utilisateur aléatoire dans un canal pré-définis"
    },

    options: [
        {
            name: "pfps-channel",

            description: "Set the pfps module's channel!",
            description_localizations: {
                "fr": "Définir le canal du module pfps"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'to',
                    type: ApplicationCommandOptionType.Channel,

                    description: 'The channel!',
                    description_localizations: {
                        "fr": "Le channel"
                    },

                    channel_types: [ChannelType.GuildText],

                    required: true
                }
            ],
        },
        {
            name: "pfps-disable",

            description: "Enable or Disable the module!",
            description_localizations: {
                "fr": "Activer ou désactiver le module"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,

                    description: 'What do you want to do ?',
                    description_localizations: {
                        "fr": "Que voulez-vous faire ?"
                    },

                    required: true,
                    choices: [
                        {
                            name: 'Power On',
                            value: "on"
                        },
                        {
                            name: "Power Off",
                            value: "off"
                        },
                    ],
                }
            ]
        }
    ],
    thinking: false,
    category: 'pfps',
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
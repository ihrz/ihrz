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
    name: "confession",

    description: "Subcommand for confession category!",
    description_localizations: {
        "fr": "Commande sous-groupé pour le module de confession"
    },

    options: [
        {
            name: "channel",

            description: "Set the confession module's channel!",
            description_localizations: {
                "fr": "Définir le canal du module confession"
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

                    required: true
                },
                {
                    name: 'button-title',
                    type: ApplicationCommandOptionType.String,

                    description: 'The button title',
                    description_localizations: {
                        "fr": "Le titre du bouton"
                    },

                    required: true
                }
            ],
        },
        {
            name: "disable",

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
        },
        {
            name: "cooldown",

            description: "Change the cooldown between confession!",
            description_localizations: {
                "fr": "Changer le cooldown entre les confession"
            },

            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'time',
                    type: ApplicationCommandOptionType.String,

                    description: 'Coolodwn\'s time like 3h/30m/10s...',
                    description_localizations: {
                        "fr": "Le temps comme 3h/30m/10s..."
                    },

                    required: true,
                }
            ]
        }
    ],
    thinking: false,
    category: 'confession',
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
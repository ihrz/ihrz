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
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: "automod",
    description: "Subcommand for automod category!",
    options: [
        {
            name: 'block',
            description: 'Block/Protect someting/behaviours into this guild!',
            type: 2,
            options: [
                {
                    name: 'pub',
                    description: 'Allow/Unallow the user to send a advertisement into them messages!',
                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,
                            description: 'What you want to do?',
                            required: true,
                            choices: [
                                {
                                    name: "Power On",
                                    value: "on"
                                },
                                {
                                    name: 'Power Off',
                                    value: "off"
                                },
                            ],
                        },
                        {
                            name: 'logs-channel',
                            description: 'The channel you want logs when user break the rules!',
                            type: ApplicationCommandOptionType.Channel,
                            required: false
                        }
                    ],
                },
                {
                    name: 'spam',
                    description: 'Block the spam message in this server!',
                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,
                            description: 'What you want to do?',
                            required: true,
                            choices: [
                                {
                                    name: 'Power On',
                                    value: "on"
                                },
                                {
                                    name: "Power Off",
                                    value: "off"
                                }
                            ],
                        },
                        {
                            name: 'logs-channel',
                            description: 'The channel you want logs when user break the rules',
                            type: ApplicationCommandOptionType.Channel,
                            required: false
                        }
                    ],
                },
                {
                    name: 'mass-mention',
                    description: 'Block the spam which have mass-mention in this message!',
                    type: 1,
                    options: [
                        {
                            name: 'action',
                            type: ApplicationCommandOptionType.String,
                            description: 'What you want to do?',
                            required: true,
                            choices: [
                                {
                                    name: 'Power On',
                                    value: "on"
                                },
                                {
                                    name: "Power Off",
                                    value: "off"
                                }
                            ],
                        },
                        {
                            name: 'max-mention-allowed',
                            type: ApplicationCommandOptionType.Number,
                            description: "Max amount of mention allowed in only one message !",
                            required: false
                        },
                        {
                            name: 'logs-channel',
                            description: "The channel you want logs when user break the rules",
                            type: ApplicationCommandOptionType.Channel,
                            required: false
                        }
                    ],
                }
            ],
        },
    ],
    thinking: true,
    category: 'guildconfig',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
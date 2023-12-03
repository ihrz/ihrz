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
    name: "pfps",
    description: "Sending random user avatar in channel!",
    options: [
        {
            name: "channel",
            description: "Set the pfps module's channel!",
            type: 1,
            options: [
                {
                    name: 'to',
                    type: ApplicationCommandOptionType.Channel,
                    description: 'The channel!',
                    required: true
                }
            ],
        },
        {
            name: "disable",
            description: "Enable or Disable the module!",
            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'What do you want to do ?',
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
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
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

/*
    /confession set channel <Channel>
    /confession set cooldown <Time in d/s/m/h>
    /confession enable <power on/power off>
    /confession report <id>
*/

import {
    Client,
    ApplicationCommandOptionType,
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: "confession",
    description: "Subcommand for fun confession!",
    options: [
        {
            name: 'set',
            description: 'Change some settings about the Confession Module!',
            type: 2,
            options: [
                {
                    name: 'channel',
                    description: 'Change the channel where confession are send!',
                    type: 1,
                    options: [
                        {
                            name: "channel",
                            type: ApplicationCommandOptionType.Channel,
                            description: "The channel you want to set!",
                            required: true
                        }
                    ],
                },
                {
                    name: 'cooldown',
                    description: 'Change the cooldown between confession for the user!',
                    type: 1,
                    options: [
                        {
                            name: "time",
                            type: ApplicationCommandOptionType.String,
                            description: "The time: (Ex: 2d = 2 Days, 3h = 3Hours, 2s = Secondes)",
                            required: true
                        }
                    ],
                },
            ],
        },
        {
            name: 'enable',
            description: 'Enable/Disable the Confession Module!',
            type: 1,
            options: [
                {
                    name: "action",
                    type: ApplicationCommandOptionType.String,
                    description: "The action you want to do!",
                    required: true,
                    choices: [
                        {
                            name: "Power On",
                            value: "on"
                        },
                        {
                            name: "Power On",
                            value: "on"
                        },
                    ]
                }
            ],
        },
        {
            name: 'report',
            description: 'Report an suggestion to the administrator of this server!',
            type: 1,
            options: [
                {
                    name: "id",
                    type: ApplicationCommandOptionType.String,
                    description: "The suggestion id you want to report!",
                    required: true,
                }
            ],
        },
    ],
    category: 'confession',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        await require('./!' + command).run(client, interaction, data);
    },
};
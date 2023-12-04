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
    EmbedBuilder,
    ApplicationCommandOptionType,
    CommandInteraction,
    CommandInteractionOptionResolver,
} from 'discord.js';

import { Command } from '../../../types/command';
import config from '../../files/config';
import ms from 'ms';

export const command: Command = {
    name: 'rolesaver',
    description: 'Re-Gave old roles when User re-join the guild!',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'Do you want to power On/Off the module ?',
            required: true,
            choices: [
                {
                    name: "Power On",
                    value: "on"
                },
                {
                    name: "Power Off",
                    value: "off"
                }
            ]
        },
        {
            name: 'settings',
            type: ApplicationCommandOptionType.String,
            description: 'Re-gave Administrator role ?',
            required: false,
            choices: [
                {
                    name: "Yes",
                    value: "yes"
                },
                {
                    name: "No",
                    value: "no"
                }
            ]
        },
        {
            name: 'timeout',
            type: ApplicationCommandOptionType.String,
            description: 'When the roles-saver timeout ?',
            required: false,
            choices: [
                {
                    name: "1 hour",
                    value: "1h"
                },
                {
                    name: "1 day",
                    value: "1d"
                },
                {
                    name: "1 week",
                    value: "1w"
                },
            ]
        },
    ],
    thinking: false,
    category: 'newfeatures',
    run: async (client: Client, interaction: CommandInteraction) => {

        let data = await client.functions.getLanguageData(interaction.guild?.id);

        var action = (interaction.options as CommandInteractionOptionResolver).getString("action");
        var settings = (interaction.options as CommandInteractionOptionResolver).getString("settings") || "None";
        var timeout = (interaction.options as CommandInteractionOptionResolver).getString("timeout") || "None";

        if (action === 'on') {
            let state = await client.db.get(`${interaction.guild?.id}.GUILD_CONFIG.rolesaver.enable`);

            let embed = new EmbedBuilder()
                .setColor("#3725a4")
                .setTitle('RoleSaver Module')
                .setDescription(`When guild members leave the server, their roles are saved in the database. Now when they join, iHorizon gives them their roles back.`)
                .addFields(
                    { name: "Enable", value: `\`${action}\``, inline: false },
                    { name: "Re-Gave Admin Roles", value: `\`${settings}\``, inline: false },
                    { name: "Timeout", value: `\`${timeout}\``, inline: false }
                )
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
            await client.db.set(`${interaction.guild?.id}.GUILD_CONFIG.rolesaver.enable`, true);
            await client.db.set(`${interaction.guild?.id}.GUILD_CONFIG.rolesaver.timeout`, timeout);
            await client.db.set(`${interaction.guild?.id}.GUILD_CONFIG.rolesaver.admin`, settings);

            return;
        } else if (action === 'off') {
            let state = await client.db.get(`${interaction.guild?.id}.GUILD_CONFIG.rolesaver.enable`);

            if (!state) {
                await interaction.reply({ content: "The module is already disable!" });
                return;
            }
            let embed = new EmbedBuilder()
                .setColor("#3725a4")
                .setTitle('RoleSaver Module')
                .setDescription(`When guild members leave the server, their roles are not saved in the database. Now, iHorizon no longer restores the old roles to members when they come back in the server.`)
                .addFields(
                    { name: "Enable", value: `\`${action}\``, inline: false },
                )
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
            await client.db.delete(`${interaction.guild?.id}.GUILD_CONFIG.rolesaver`);
            return;
        }
    },
};
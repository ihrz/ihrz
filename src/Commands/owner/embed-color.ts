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
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'embed-color',
    description: 'Set the embed color !',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: `What do you want to do ?`,
            required: true,
            choices: [
                {
                    name: 'Reset All Settings',
                    value: 'reset'
                },
                {
                    name: 'Set for iHorizon-Logs (#ihorizon-logs) Embed!',
                    value: 'ihrz-logs'
                },
                {
                    name: 'Set for Giveaway Embed!',
                    value: 'gw'
                },
                {
                    name: 'Set for Audits-Logs Embed!',
                    value: 'audits-logs'
                },
                {
                    name: 'Set for Fun Command Embed!',
                    value: 'fun-cmd'
                },
                {
                    name: 'Set for Utils Command Embed!',
                    value: 'utils-cmd'
                },
                {
                    name: 'Set for Mod Command Embed!',
                    value: 'mod-cmd'
                },
                {
                    name: 'Set for Music Command Embed!',
                    value: 'music-cmd'
                },
                {
                    name: 'All others Embed!',
                    value: 'all'
                },
            ]
        },
        {
            name: 'hex-color',
            type: ApplicationCommandOptionType.String,
            description: `Use www.color-hex.com`,
            required: false
        },
    ],
    thinking: false,
    category: 'owner',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.setjoindm_not_admin });
            return;
        };

        let choices = interaction.options.getString("action");
        let hex_color = interaction.options.getString("hex-color");
        var reg = /^#([0-9a-f]{3}){1,2}$/i;

        if (choices === 'reset') {
            await client.db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.all`);

            await interaction.reply({
                content: `${interaction.user}, now the color of all embeds are deleted!`
            });

            return;
        };

        if (hex_color && reg.test(hex_color)) {
            let key = ``;

            if (choices === 'all') {
                key = `${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.all`;
            } else {
                key = `${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.${choices}`;
            };

            await client.db.set(key, hex_color);

            await interaction.reply({
                content: `${interaction.user}, now the embed color is \`${hex_color}\` for ${choices} !`
            });

            return;
        } else {
            await interaction.reply({ content: `${interaction.user}, color is not in the right format.\nPlease refer to **www.color-hex.com**` });
            return;
        };
    },
};
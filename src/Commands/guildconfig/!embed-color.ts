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
} from 'discord.js';

import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setjoindm_not_admin });
            return;
        };

        let choices = interaction.options.getString("action");
        let hex_color = interaction.options.getString("hex-color");
        var reg = /^#([0-9a-f]{3}){1,2}$/i;

        if (choices === 'reset') {
            await db.DataBaseModel({
                id: db.Delete,
                key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color`,
                value: hex_color
            });

            await interaction.editReply({
                content: `${interaction.user}, now the color of all embeds are reseted!`
            });

            return;
        };

        if (hex_color && reg.test(hex_color)) {
            let key = ``

            if (choices === 'all') {
                key = `${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color`;
            } else {
                key = `${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.${choices}`;
            };

            await db.DataBaseModel({
                id: db.Set,
                key: key,
                value: hex_color
            });

            await interaction.editReply({
                content: `${interaction.user}, now the embed color is \`${hex_color}\` for ${choices} !`
            });

            return;
        } else {
            await interaction.editReply({ content: `${interaction.user}, color is not in the right format.\nPlease refer to **www.color-hex.com**` });
            return;
        };
    },
};
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
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    User
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';

export const command: Command = {
    name: 'leaderboard',
    description: 'Show the guild invites\'s leaderboard!',
    category: 'invitemanager',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        var text = data.leaderboard_default_text;
        const ownerList = await db.DataBaseModel({ id: db.All });
        const foundArray = ownerList.findIndex((d: { id: any; }) => d.id === interaction.guild.id);

        await interaction.reply({ content: ":clock:" });

        const char = ownerList[foundArray].value.USER;
        for (const i in char) {
            const a = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${i}.INVITES` });
            if (a && a.invites >= 1) {
                text += data.leaderboard_text_inline
                    .replace(/\${i}/g, i)
                    .replace(/\${a\.invites\s*\|\|\s*0}/g, a.invites || 0)
                    .replace(/\${a\.regular\s*\|\|\s*0}/g, a.regular || 0)
                    .replace(/\${a\.bonus\s*\|\|\s*0}/g, a.bonus || 0)
                    .replace(/\${a\.leaves\s*\|\|\s*0}/g, a.leaves || 0);
            }
        }

        const embed = new EmbedBuilder().setColor("#FFB6C1").setDescription(text || '?').setTimestamp();
        return await interaction.editReply({ embeds: [embed], content: ' ' });
    },
};
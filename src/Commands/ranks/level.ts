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
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import ms from 'ms';
import config from '../../files/config';

export const command: Command = {
    name: 'level',
    description: "Get the user's xp level!",
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to lookup, keep blank if you want to show your stats',
            required: false
        }
    ],
    category: 'ranks',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let user = interaction.options.getUser("user") || interaction.user;

        var level = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.id}.XP_LEVELING.level` }) || 0;
        var currentxp = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.id}.XP_LEVELING.xp` }) || 0;

        var xpNeeded = level * 500 + 500
        var expNeededForLevelUp = xpNeeded - currentxp
        let nivEmbed = new EmbedBuilder()
            .setTitle(data.level_embed_title
                .replace('${user.username}', user.username)
            )
            .setColor('#0014a8')
            .addFields({
                name: data.level_embed_fields1_name, value: data.level_embed_fields1_value
                    .replace('${currentxp}', currentxp)
                    .replace('${xpNeeded}', xpNeeded), inline: true
            },
                {
                    name: data.level_embed_fields2_name, value: data.level_embed_fields2_value
                        .replace('${level}', level), inline: true
                })
            .setDescription(data.level_embed_description
                .replace('${expNeededForLevelUp}', expNeededForLevelUp)
            )
            .setTimestamp()
            .setThumbnail("https://cdn.discordapp.com/attachments/847484098070970388/850684283655946240/discord-icon-new-2021-logo-09772BF096-seeklogo.com.png")
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })

        return await interaction.reply({ embeds: [nivEmbed] });
    },
};
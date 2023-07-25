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
import logger from '../../core/logger';
import ms from 'ms';
import config from '../../files/config';

import * as db from '../../core/functions/DatabaseModel';

export const command: Command = {
    name: 'guildinfo',
    description: 'Get information about the server!',
    category: 'utils',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        const verlvl: any = {
            NONE: data.serverinfo_verlvl_NONE,
            LOW: data.serverinfo_verlvl_LOW,
            MEDIUM: data.serverinfo_verlvl_MEDIUM,
            HIGHT: data.serverinfo_verlvl_HIGHT,
            VERY_HIGHT: data.serverinfo_verlvl_VERY_HIGHT
        };

        let embeds = new EmbedBuilder()
            .setColor("#C3B2A1")
            .setAuthor({
                name: data.serverinfo_embed_author
                    .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                , iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`
            })
            .setDescription(data.serverinfo_embed_description
                .replace(/\${interaction\.guild\.description}/g, interaction.guild.description))
            .addFields(
                { name: data.serverinfo_embed_fields_name, value: `📕\`${interaction.guild.name}\``, inline: true },
                { name: data.serverinfo_embed_fields_members, value: `📕\`${interaction.guild.memberCount}\``, inline: true },
                { name: data.serverinfo_embed_fields_id, value: `📕\`${interaction.guild.id}\``, inline: true },
                { name: data.serverinfo_embed_fields_owner, value: `➡\<@${interaction.guild.ownerId}>`, inline: true },
                { name: data.serverinfo_embed_fields_verlvl, value: `📕\`${verlvl[interaction.guild.verificationLevel]}\``, inline: true },
                { name: data.serverinfo_embed_fields_region, value: `📕\`${interaction.guild.preferredLocale}\``, inline: true },
                { name: data.serverinfo_embed_fields_roles, value: `📕\`${interaction.guild.roles.cache.size}\``, inline: true },
                { name: data.serverinfo_embed_fields_channels, value: `📕\`${interaction.guild.channels.cache.size}\``, inline: true },
                { name: data.serverinfo_embed_fields_joinat, value: `📕\`${interaction.member.joinedAt}\``, inline: true },
                { name: data.serverinfo_embed_fields_createat, value: `📕\`${interaction.guild.createdAt}\``, inline: true }
            )
            .setTimestamp()
            .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`)
            .setImage(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.banner}.png`);

        return interaction.reply({ embeds: [embeds] });
    },
};
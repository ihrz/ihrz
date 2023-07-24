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
    name: "profil",
    description: "See them iHorizon's profile!",
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you wan\'t to lookup',
            required: false
        }
    ],
    category: 'profil',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        const member = interaction.options.getUser('user') || interaction.user;

        var description = await db.DataBaseModel({ id: db.Get, key: `GLOBAL.USER_PROFIL.${member.id}.desc` });
        if (!description) var description = data.profil_not_description_set;

        var level: Number = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.id}.XP_LEVELING.level` });
        if (!level) var level: Number = 0;

        var balance: Number = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.id}.ECONOMY.money` });
        if (!balance) var balance: Number = 0;

        var age = await db.DataBaseModel({ id: db.Get, key: `GLOBAL.USER_PROFIL.${member.id}.age` });
        if (!age) var age = data.profil_unknown;

        var gender = await db.DataBaseModel({ id: db.Get, key: `GLOBAL.USER_PROFIL.${member.id}.gender` });
        if (!gender) var gender = data.profil_unknown;

        let profil = new EmbedBuilder()
            .setTitle(data.profil_embed_title
                .replace(/\${member\.tag}/g, member.username)
            )
            .setDescription(`\`${description}\``)
            .addFields(
                { name: data.profil_embed_fields_nickname, value: member.username, inline: false },
                { name: data.profil_embed_fields_money, value: balance + data.profil_embed_fields_money_value, inline: false },
                { name: data.profil_embed_fields_xplevels, value: level + data.profil_embed_fields_xplevels_value, inline: false },
                { name: data.profil_embed_fields_age, value: age + data.profil_embed_fields_age_value, inline: false },
                { name: data.profil_embed_fields_gender, value: `${gender}`, inline: false })
            .setColor("#ffa550")
            .setThumbnail(member.avatarURL({ format: 'png', dynamic: true, size: 512 }))
            .setTimestamp()
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })

        return interaction.reply({ embeds: [profil] });
    },
};
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
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms from 'ms';

export const command: Command = {
    name: "profil",
    description: "Subcommand for profil category!",
    options: [
        {
            name: "show",
            description: "See the iHorizon's profile of the member!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you wan\'t to lookup',
                    required: false
                }
            ],
        },
        {
            name: "set-age",
            description: "Set your age on the iHorizon Profil !",
            type: 1,
            options: [
                {
                    name: 'age',
                    type: ApplicationCommandOptionType.Number,
                    description: 'you age on the iHorizon profil',
                    required: true
                }
            ],
        },
        {
            name: "set-description",
            description: "Set your description on the iHorizon Profil!",
            type: 1,
            options: [
                {
                    name: 'descriptions',
                    type: ApplicationCommandOptionType.String,
                    description: 'you descriptions on the iHorizon profil',
                    required: true
                }
            ],
        },
        {
            name: "set-gender",
            description: "Set your gender on the iHorizon Profil!",
            type: 1,
            options: [
                {
                    name: 'gender',
                    type: ApplicationCommandOptionType.String,
                    description: "Please make your choice.",
                    required: true,
                    choices: [
                        {
                            name: "♀ Female",
                            value: "♀️ Female"
                        },
                        {
                            name: "♂ Male",
                            value: "♂️ Male"
                        },
                        {
                            name: "🚻 Other",
                            value: "⚧️ Other"
                        }
                    ]
                }
            ],
        }
    ],
    category: 'profil',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'show') {

            let member = interaction.options.getUser('user') || interaction.user;

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

        } else if (command === 'set-age') {

            var age = interaction.options.getNumber("age");
            await db.DataBaseModel({ id: db.Set, key: `GLOBAL.USER_PROFIL.${interaction.user.id}.age`, value: age });

            return interaction.reply({ content: data.setprofilage_command_work });

        } else if (command === 'set-description') {

            var desc = interaction.options.getString("descriptions");
            await db.DataBaseModel({ id: db.Set, key: `GLOBAL.USER_PROFIL.${interaction.user.id}.desc`, value: desc });

            return interaction.reply({ content: data.setprofildescriptions_command_work });

        } else if (command === 'set-gender') {

            var gender = interaction.options.getString("gender");
            await db.DataBaseModel({ id: db.Set, key: `GLOBAL.USER_PROFIL.${interaction.user.id}.gender`, value: gender })
            
            return interaction.reply({ content: data.setprofildescriptions_command_work });
    
        };
    },
}
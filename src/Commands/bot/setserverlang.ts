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
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';

export const command: Command = {
    name: 'setserverlang',
    description: 'Set the server language!',
    options: [
        {
            name: 'language',
            type: ApplicationCommandOptionType.String,
            description: 'What language you want ? (soon more)',
            required: true,
            choices: [
                {
                    name: "Deutsch",
                    value: "de-DE"
                },
                {
                    name: "English",
                    value: "en-US"
                },
                {
                    name: "French",
                    value: "fr-FR"
                },
                {
                    name: "Italian",
                    value: "it-IT"
                },
                {
                    name: "Japanese",
                    value: "jp-JP"
                },
                {
                    name: "Spanish",
                    value: "es-ES"
                }
            ],
        }
    ],
    category: 'bot',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let type = interaction.options.getString("language");

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setserverlang_not_admin });
            return;
        };

        let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.LANG` });

        if (already?.lang === type) {
            await interaction.editReply({ content: data.setserverlang_already });
            return;
        }

        await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.LANG`, value: { lang: type } });
        data = await client.functions.getLanguageData(interaction.guild.id);

        try {
            let logEmbed = new EmbedBuilder()
                .setColor(await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`}) || "#bf0bb9")
                .setTitle(data.setserverlang_logs_embed_title_on_enable)
                .setDescription(data.setserverlang_logs_embed_description_on_enable
                    .replace(/\${type}/g, type)
                    .replace(/\${interaction\.user.id}/g, interaction.user.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
        } catch (e: any) { logger.err(e) };

        await interaction.editReply({ content: data.setserverlang_command_work_enable.replace(/\${type}/g, type) });
        return;
    },
};
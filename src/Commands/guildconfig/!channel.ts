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
            return interaction.editReply({ content: data.setchannels_not_admin });
        };

        let type = interaction.options.getString("type");
        let argsid = interaction.options.getChannel("channel");

        if (type === "join") {
            if (!argsid) return interaction.editReply({ content: data.setchannels_not_specified_args })

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_join)
                    .setDescription(data.setchannels_logs_embed_description_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) {
                    logchannel.send({ embeds: [logEmbed] })
                }
            } catch (e: any) {
                logger.err(e)
            };

            try {
                let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` })
                if (already === argsid.id) return interaction.editReply({ content: data.setchannels_already_this_channel_on_join })
                interaction.client.channels.cache.get(argsid.id).send({ content: data.setchannels_confirmation_message_on_join })
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join`, value: argsid.id })

                return interaction.editReply({
                    content: data.setchannels_command_work_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                });
            } catch (e) {
                interaction.editReply({ content: data.setchannels_command_error_on_join });
            }
        } else if (type === "leave") {
            try {
                if (!argsid) return interaction.editReply({ content: data.setchannels_not_specified_args });
                let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });

                if (already === argsid.id) return interaction.editReply({ content: data.setchannels_already_this_channel_on_leave })
                interaction.client.channels.cache.get(argsid.id)?.send({ content: data.setchannels_confirmation_message_on_leave })
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`, value: argsid.id });

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setchannels_logs_embed_title_on_leave)
                        .setDescription(data.setchannels_logs_embed_description_on_leave
                            .replace(/\${argsid\.id}/g, argsid.id)
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) {
                        logchannel.send({ embeds: [logEmbed] })
                    }
                } catch (e: any) {
                    logger.err(e)
                };

                await interaction.editReply({
                    content: data.setchannels_command_work_on_leave
                        .replace(/\${argsid\.id}/g, argsid.id)
                });
                return;

            } catch (e) {
                await interaction.editReply({ content: data.setchannels_command_error_on_leave });
                return;
            };
        } else if (type === "off") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_off)
                    .setDescription(data.setchannels_logs_embed_description_on_off
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    logchannel.send({ embeds: [logEmbed] })
                };
            } catch (e: any) {
                logger.err(e)
            };

            let leavec: string = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
            let joinc: string = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
            if (!joinc && !leavec) return interaction.editReply({ content: data.setchannels_already_on_off });

            await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
            await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
            return interaction.editReply({ content: data.setchannels_command_work_on_off });
        };
    },
}
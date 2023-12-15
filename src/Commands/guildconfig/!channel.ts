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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

import logger from '../../core/logger';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: any) => {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setchannels_not_admin });
            return;
        };

        let type = interaction.options.getString("type");
        let argsid = interaction.options.getChannel("channel");

        if (type === "join") {
            if (!argsid) {
                await interaction.editReply({ content: data.setchannels_not_specified_args });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_join)
                    .setDescription(data.setchannels_logs_embed_description_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) {
                    (logchannel as BaseGuildTextChannel)?.send({ embeds: [logEmbed] })
                }
            } catch (e: any) {
                logger.err(e)
            };

            try {
                let already = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`);
                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setchannels_already_this_channel_on_join });
                    return;
                };
                (interaction.client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({ content: data.setchannels_confirmation_message_on_join });
                await client.db.set(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`, argsid.id);

                await interaction.editReply({
                    content: data.setchannels_command_work_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                });
                return;
            } catch (e) {
                interaction.editReply({ content: data.setchannels_command_error_on_join });
            };

        } else if (type === "leave") {
            try {
                if (!argsid) {
                    await interaction.editReply({ content: data.setchannels_not_specified_args });
                    return;
                };

                let already = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`);

                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setchannels_already_this_channel_on_leave });
                    return;
                };

                (interaction.client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({ content: data.setchannels_confirmation_message_on_leave });
                await client.db.set(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`, argsid.id);

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setchannels_logs_embed_title_on_leave)
                        .setDescription(data.setchannels_logs_embed_description_on_leave
                            .replace(/\${argsid\.id}/g, argsid.id)
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        );

                    let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) {
                        (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
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

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                };
            } catch (e: any) {
                logger.err(e)
            };

            let leavec: string = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`);
            let joinc: string = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`);
            if (!joinc && !leavec) {
                await interaction.editReply({ content: data.setchannels_already_on_off });
                return;
            };

            await client.db.delete(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.join`);
            await client.db.delete(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leave`);
            await interaction.editReply({ content: data.setchannels_command_work_on_off });
            return;
        };
    },
};
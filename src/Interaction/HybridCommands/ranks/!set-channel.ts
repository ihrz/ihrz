/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    BaseGuildTextChannel,
    Channel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
    PermissionsBitField,
    User,
} from 'pwss';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommandArgumentValue } from '../../../core/functions/arg.js';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var type = interaction.options.getString("action");
            var argsid = interaction.options.getChannel("channel") as Channel;
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var type = client.args.string(args!, 0);
            var argsid = client.args.channel(interaction, 0) || interaction.channel;
        };

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { content: data.setxpchannels_not_admin });
            return;
        };

        if (type === "on") {
            if (!argsid) {
                await client.args.interactionSend(interaction, { content: data.setxpchannels_valid_channel_message });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`) || "#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_enable)
                    .setDescription(data.setxpchannels_logs_embed_description_enable.replace(/\${interaction\.user.id}/g, interaction.member.user.id)
                        .replace(/\${argsid}/g, argsid.id))

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                };
            } catch (e: any) {
                logger.err(e)
            };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.XP_LEVELING.xpchannels`);
                if (already === argsid.id) return await client.args.interactionSend(interaction, { content: data.setxpchannels_already_with_this_config });

                (client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({ content: data.setxpchannels_confirmation_message });
                await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.xpchannels`, argsid.id);

                await client.args.interactionSend(interaction, { content: data.setxpchannels_command_work_enable.replace(/\${argsid}/g, argsid.id) });
                return;
            } catch (e) {
                await client.args.interactionSend(interaction, { content: data.setxpchannels_command_error_enable });
                return;
            };
        } else if (type == "off") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`) || "#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_disable)
                    .setDescription(data.setxpchannels_logs_embed_description_disable.replace(/\${interaction\.user.id}/g, interaction.member.user.id))

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                };
            } catch (e: any) {
                logger.err(e)
            };

            try {
                let already2 = await client.db.get(`${interaction.guildId}.GUILD.XP_LEVELING.xpchannels`);

                if (already2 === "off") {
                    await client.args.interactionSend(interaction, { content: data.setxpchannels_already_disabled_disable });
                    return;
                };

                await client.db.delete(`${interaction.guildId}.GUILD.XP_LEVELING.xpchannels`);
                await client.args.interactionSend(interaction, { content: data.setxpchannels_command_work_disable });
                return;
            } catch (e) {
                await client.args.interactionSend(interaction, { content: data.setxpchannels_command_error_disable });
                return;
            };
        };
    },
};
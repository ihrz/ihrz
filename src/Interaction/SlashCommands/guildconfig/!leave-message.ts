/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setleavemessage_not_admin });
            return;
        };

        let type = interaction.options.getString("value");
        let messagei = interaction.options.getString("message");

        let help_embed = new EmbedBuilder()
            .setColor("#016c9a")
            .setTitle(data.setleavemessage_help_embed_title)
            .setDescription(data.setleavemessage_help_embed_description)
            .addFields({
                name: data.setleavemessage_help_embed_fields_name,
                value: data.setleavemessage_help_embed_fields_value
            });

        if (type == "on") {
            if (messagei) {
                let joinmsgreplace = messagei
                    .replaceAll("{user}", "{user}")
                    .replaceAll("{guild}", "{guild}")
                    .replaceAll("{membercount}", "{membercount}")
                    .replaceAll("\\n", '\n')

                await client.db.set(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leavemessage`, joinmsgreplace);

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setleavemessage_logs_embed_title_on_enable)
                        .setDescription(data.setleavemessage_logs_embed_description_on_enable
                            .replace("${interaction.user.id}", interaction.user.id)
                        );

                    let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                    if (logchannel) {
                        (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                    };
                } catch (e: any) {
                    logger.err(e);
                };

                await interaction.editReply({
                    content: data.setleavemessage_command_work_on_enable.replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                });
                return;
            }

        } else if (type == "off") {
            await client.db.delete(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leavemessage`);
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setleavemessage_logs_embed_title_on_disable)
                    .setDescription(data.setleavemessage_logs_embed_description_on_disable
                        .replace("${interaction.user.id}", interaction.user.id)
                    );

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                };
            } catch (e: any) {
                logger.err(e)
            };

            await interaction.editReply({
                content: data.setleavemessage_command_work_on_disable.replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
            });
            return;
        } else if (type == "ls") {
            var ls = await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.leavemessage`);

            let embed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.globalName || interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setColor('#1481c1')
                .setDescription(ls || 'None')
                .setTimestamp()
                .setTitle(data.setleavemessage_command_work_ls)
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setThumbnail(interaction.guild?.iconURL() as string);

            await interaction.editReply({
                embeds: [embed],
                files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
            });

            return;
        } else if (!messagei) {
            await interaction.editReply({ embeds: [help_embed] });
            return;
        };
    },
};
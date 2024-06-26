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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    GuildMember
} from 'pwss';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let tomute = interaction.options.getMember("user") as GuildMember;
        let permission = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages);

        if (!permission) {
            await interaction.editReply({
                content: data.unmute_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has([PermissionsBitField.Flags.ManageRoles])) {
            await interaction.editReply({
                content: data.unmute_i_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (tomute.id === interaction.user.id) {
            await interaction.editReply({
                content: data.unmute_attempt_mute_your_self.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!tomute.isCommunicationDisabled() === true) {
            await interaction.editReply({ content: data.unmute_not_muted });
            return;
        };

        tomute.disableCommunicationUntil(Date.now());

        await interaction.editReply({
            content: data.unmute_command_work
                .replace("${tomute.id}", tomute.id)
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.unmute_logs_embed_title)
                .setDescription(data.unmute_logs_embed_description
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${tomute.id}", tomute.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
            };
        } catch (e: any) {
            logger.err(e)
        };
    },
};
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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    PermissionsBitField,
} from 'pwss';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let tomute = interaction.options.getMember("user") as GuildMember;
        let mutetime = interaction.options.getString("time")!;
        let mutetimeMS = client.timeCalculator.to_ms(mutetime)!;
        let mutetimeString = client.timeCalculator.to_beautiful_string(mutetime);

        let permission = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages);

        if (!permission) {
            await interaction.editReply({
                content: data.tempmute_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has([PermissionsBitField.Flags.ManageMessages])) {
            await interaction.editReply({
                content: data.tempmute_i_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (tomute.id === interaction.user.id) {
            await interaction.editReply({
                content: data.tempmute_cannot_mute_yourself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        }

        if (tomute.isCommunicationDisabled() === true) {
            await interaction.editReply({ content: data.tempmute_already_muted });
            return;
        };

        await (tomute.timeout(mutetimeMS, data.tempmute_logs_embed_title)).catch(() => { });

        await interaction.editReply(data.tempmute_command_work
            .replace("${tomute.id}", tomute.id)
            .replace("${ms(ms(mutetime))}", mutetimeString)
        );

        setTimeout(async () => {
            await interaction.channel?.send({
                content: data.tempmute_unmuted_by_time.replace("${tomute.id}", tomute.id),
            });
        }, mutetimeMS);

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.tempmute_logs_embed_title)
                .setDescription(data.tempmute_logs_embed_description
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${tomute.id}", tomute.id)
                    .replace("${ms(ms(mutetime))}", mutetimeString)
                )

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
            };
        } catch (e: any) {
            logger.err(e)
        };
    },
};
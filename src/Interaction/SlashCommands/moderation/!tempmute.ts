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
    GuildMember,
    PermissionsBitField,
} from 'discord.js';

import logger from '../../../core/logger.js';

import ms, { StringValue } from 'ms';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let mutetime = interaction.options.getString("time")?.split(" ")[0];
        let tomute = interaction.options.getMember("user") as GuildMember;

        let permission = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages);

        if (!permission) {
            await interaction.editReply({
                content: data.tempmute_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!interaction.guild?.members.me?.permissions.has([PermissionsBitField.Flags.ManageMessages])) {
            await interaction.editReply({
                content: data.tempmute_i_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (tomute?.id === interaction.user.id) {
            await interaction.editReply({
                content: data.tempmute_cannot_mute_yourself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        }

        if (tomute.isCommunicationDisabled() === true) {
            await interaction.editReply({ content: data.tempmute_already_muted });
            return;
        };

        await (tomute.timeout(ms(mutetime as StringValue), data.tempmute_logs_embed_title)).catch(() => { });

        await interaction.editReply(data.tempmute_command_work
            .replace("${tomute.id}", tomute.id)
            .replace("${ms(ms(mutetime))}", ms(ms(mutetime as StringValue)))
        );

        setTimeout(async () => {
            await interaction.channel?.send({
                content: data.tempmute_unmuted_by_time.replace("${tomute.id}", tomute.id),
            });
        }, ms(mutetime as StringValue));
        
        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.tempmute_logs_embed_title)
                .setDescription(data.tempmute_logs_embed_description
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${tomute.id}", tomute.id)
                    .replace("${ms(ms(mutetime))}", ms(ms(mutetime as StringValue)))
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
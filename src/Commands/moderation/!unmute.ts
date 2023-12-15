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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    GuildMember
} from 'discord.js';

import logger from '../../core/logger';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: any) => {

        let tomute = interaction.options.getMember("user") as GuildMember;
        let permission = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages);

        if (!permission) {
            await interaction.editReply({ content: data.unmute_dont_have_permission });
            return;
        };

        if (!interaction.guild?.members.me?.permissions.has([PermissionsBitField.Flags.ManageRoles])) {
            await interaction.editReply({ content: data.unmute_i_dont_have_permission });
            return;
        };

        if (tomute.id === interaction.user.id) {
            await interaction.editReply({ content: data.unmute_attempt_mute_your_self });
            return;
        };
        
        let muterole = interaction.guild.roles.cache.find((role: { name: string; }) => role.name === 'muted');

        if (!tomute.roles.cache.has(muterole?.id!)) {
            await interaction.editReply({ content: data.unmute_not_muted });
            return;
        };

        if (!muterole) {
            await interaction.editReply({ content: data.unmute_muted_role_doesnt_exist });
            return;
        };

        tomute.roles.remove(muterole.id);

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
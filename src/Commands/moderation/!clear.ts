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

import logger from '../../core/logger';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
        var numberx = interaction.options.getNumber("number") + 1;
        if (!permission) return interaction.editReply({ content: data.clear_dont_have_permission });

        if (numberx > 98) {
            await interaction.editReply({ content: data.clear_max_message_limit });
            return;
        };

        interaction.channel.bulkDelete(numberx, true)
            .then((messages: { size: any; }) => {
                interaction.channel.send({
                    content: data.clear_confirmation_message
                        .replace(/\${messages\.size}/g, messages.size)
                });

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.clear_logs_embed_title)
                        .setDescription(data.clear_logs_embed_description
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            .replace(/\${messages\.size}/g, messages.size)
                            .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
                        )
                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                    if (logchannel) {
                        logchannel.send({ embeds: [logEmbed] });
                    };
                } catch (e: any) {
                    logger.err(e)
                };
            });
    },
};
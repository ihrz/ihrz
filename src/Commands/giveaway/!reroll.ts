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
        let inputData = interaction.options.getString("giveaway-id");

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.editReply({ content: data.reroll_not_perm });
            return;
        };

        let giveaway =
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.prize === inputData) ||
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.messageId === inputData);
        if (!giveaway) {
            await interaction.editReply({
                content: data.reroll_dont_find_giveaway
                    .replace("{args}", inputData)
            });
            return;
        };

        client.giveawaysManager
            .reroll(giveaway.messageId)
            .then(() => {
                interaction.editReply({ content: data.reroll_command_work });
                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.reroll_logs_embed_title)
                        .setDescription(data.reroll_logs_embed_description
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            .replace(/\${giveaway\.messageID}/g, giveaway?.messageId)
                        )

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    
                    if (logchannel) {
                        logchannel.send({ embeds: [logEmbed] })
                    };
                } catch (e: any) {
                    logger.err(e)
                };
            })
            .catch((error) => {
                if (error.startsWith(`Giveaway with message Id ${giveaway?.messageId} is not ended.`)) {
                    interaction.editReply({ content: `This giveaway is not over!` });
                    return;
                } else {
                    interaction.editReply({ content: data.reroll_command_error });
                    return;
                }
            });
    },
};
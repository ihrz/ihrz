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
    TextBasedChannel,
} from 'discord.js';

import { Create } from '../../../core/giveawaysManager';
import { LanguageData } from '../../../../types/languageData';

import logger from '../../../core/logger';
import ms from 'ms';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.editReply({ content: data.start_not_perm });
            return;
        };

        let giveawayChannel = interaction.channel;
        var giveawayDuration = interaction.options.getString("time");
        let giveawayNumberWinners = interaction.options.getNumber("winner");

        if (isNaN(giveawayNumberWinners as number) || (parseInt(giveawayNumberWinners as unknown as string) <= 0)) {
            await interaction.editReply({ content: data.start_is_not_valid });
            return;
        };

        let giveawayPrize = interaction.options.getString("prize");
        let giveawayDurationFormated = ms(giveawayDuration as unknown as number);

        if (Number.isNaN(giveawayDurationFormated)) {
            await interaction.editReply({
                content: data.start_time_not_valid
                    .replace('${interaction.user}', interaction.user as unknown as string)
            });
            return;
        };

        Create(giveawayChannel as TextBasedChannel, {
            duration: parseInt(giveawayDurationFormated),
            prize: giveawayPrize!,
            winnerCount: giveawayNumberWinners!,
            hostedBy: interaction.user,
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.reroll_logs_embed_title)
                .setDescription(data.start_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace(/\${giveawayChannel}/g, giveawayChannel as unknown as string)
                );

            let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) {
                (logchannel as BaseGuildTextChannel)?.send({ embeds: [logEmbed] })
            };
        } catch (e: any) {
            logger.err(e)
        };

        await interaction.editReply({
            content: data.start_confirmation_command
                .replace(/\${giveawayChannel}/g, giveawayChannel as unknown as string)
        });

        return;
    },
};
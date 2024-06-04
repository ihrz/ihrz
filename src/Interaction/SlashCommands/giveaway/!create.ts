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
    TextBasedChannel,
} from 'discord.js';

import { AxiosResponse, axios } from '../../../core/functions/axios.js';
import logger from '../../../core/logger.js';

import { LanguageData } from '../../../../types/languageData';

async function isImageUrl(url: string): Promise<boolean> {
    try {
        const response = await axios.head(url);
        const contentType = response.headers.get("content-type");
        return contentType.startsWith("image/");
    } catch (error) {
        return false;
    }
};

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.editReply({ content: data.start_not_perm });
            return;
        };

        let giveawayChannel = interaction.channel!;
        var giveawayDuration = interaction.options.getString("time");
        let giveawayNumberWinners = interaction.options.getNumber("winner")!;
        var imageUrl = interaction.options.getString('image') as string;

        if (isNaN(giveawayNumberWinners as number) || (parseInt(giveawayNumberWinners?.toString()) <= 0)) {
            await interaction.editReply({ content: data.start_is_not_valid });
            return;
        };

        let giveawayPrize = interaction.options.getString("prize");
        let giveawayDurationFormated = client.timeCalculator.to_ms(giveawayDuration!);

        if (!giveawayDurationFormated) {
            await interaction.editReply({
                content: data.start_time_not_valid
                    .replace('${interaction.user}', interaction.user.toString())
            });
            return;
        };

        await client.giveawaysManager.create(giveawayChannel as TextBasedChannel, {
            duration: giveawayDurationFormated,
            prize: giveawayPrize as string,
            winnerCount: giveawayNumberWinners as number,
            hostedBy: interaction.user.id,
            embedImageURL: await isImageUrl(imageUrl) ? imageUrl : null
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.reroll_logs_embed_title)
                .setDescription(data.start_logs_embed_description
                    .replace('${interaction.user.id}', interaction.user.id)
                    .replace(/\${giveawayChannel}/g, giveawayChannel?.toString()!)
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
                .replace(/\${giveawayChannel}/g, giveawayChannel.toString())
        });

        return;
    },
};
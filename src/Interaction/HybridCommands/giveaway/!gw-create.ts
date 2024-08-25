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
    TextBasedChannel,
} from 'discord.js';

import { AxiosResponse, axios } from '../../../core/functions/axios.js';
import logger from '../../../core/logger.js';

import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method.js';

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
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        const permissionsArray = [PermissionsBitField.Flags.ManageMessages]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.method.interactionSend(interaction, { content: data.start_not_perm });
            return;
        };

        var giveawayChannel = interaction.channel! as Channel;

        if (interaction instanceof ChatInputCommandInteraction) {
            var giveawayRequirement = interaction.options.getString("requirement");
            var giveawayRequirementValue = interaction.options.getString("requirement-value");
            var giveawayDuration = interaction.options.getString("time");
            var giveawayNumberWinners = interaction.options.getNumber("winner")!;
            var imageUrl = interaction.options.getString('image') as string;
            var giveawayPrize = interaction.options.getString("prize");
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var giveawayNumberWinners = client.method.number(args!, 0);
            var giveawayDuration = client.method.string(args!, 1);
            var giveawayRequirement = client.method.string(args!, 2);
            var giveawayPrize = client.method.string(args!, 3);
            var giveawayRequirementValue = client.method.string(args!, 4);
            var imageUrl = ""
        };

        if (isNaN(giveawayNumberWinners as number) || (parseInt(giveawayNumberWinners.toString()) <= 0)) {
            await client.method.interactionSend(interaction, { content: data.start_is_not_valid });
            return;
        };

        let giveawayDurationFormated = client.timeCalculator.to_ms(giveawayDuration!);

        if (!giveawayDurationFormated) {
            await client.method.interactionSend(interaction, {
                content: data.start_time_not_valid
                    .replace('${interaction.user}', interaction.member.user.toString())
            });
            return;
        };

        await client.giveawaysManager.create(giveawayChannel as BaseGuildTextChannel, {
            duration: giveawayDurationFormated,
            prize: giveawayPrize as string,
            winnerCount: giveawayNumberWinners as number,
            hostedBy: interaction.member.user.id,
            embedImageURL: await isImageUrl(imageUrl) ? imageUrl : null,
            requirement: { type: giveawayRequirement as any, value: giveawayRequirementValue }
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`) || "#bf0bb9")
                .setTitle(data.reroll_logs_embed_title)
                .setDescription(data.start_logs_embed_description
                    .replace('${interaction.user.id}', interaction.member.user.id)
                    .replace(/\${giveawayChannel}/g, giveawayChannel.toString()!)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
            };
        } catch (e: any) {
            logger.err(e)
        };

        await client.method.interactionSend(interaction, {
            content: data.start_confirmation_command
                .replace(/\${giveawayChannel}/g, giveawayChannel.toString())
        });

        return;
    },
};
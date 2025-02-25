/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
    Channel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var channel = interaction.options.getChannel("channel") as Channel;
            var time = interaction.options.getString("time")
        } else {
            var channel = await client.method.channel(interaction, args!, 0) as Channel;
            var time = client.method.string(args!, 1);
        };

        let parseTime = client.timeCalculator.to_ms(time || "");

        if (parseTime && parseTime < 60_000) {
            await client.method.interactionSend(interaction, {
                content: lang.util_autorenew_time_too_short
            })
            return;
        } else if (parseTime && parseTime > 60_000 * 60 * 24) {
            await client.method.interactionSend(interaction, {
                content: lang.util_autorenew_time_too_long
            })
            return;
        }

        if (parseTime) {
            await client.db.set(`${interaction.guildId}.UTILS.renew_channel.${channel.id}`, {
                timestamp: Date.now(),
                maxTime: parseTime
            });

            await client.method.interactionSend(interaction, {
                content: lang.util_autorenew_command_ok
                    .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                    .replace("${channel.toString()}", channel.toString())
                    .replace("${time}", client.timeCalculator.to_beautiful_string(parseTime, lang))
            })
        }
    },
};
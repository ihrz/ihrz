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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    InteractionEditReplyOptions,
    Message,
    MessageReplyOptions,
    PermissionsBitField
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var action = interaction.options.getString("time") as string;
        } else {

            var action = (client.method.string(args!, 0) || "0s") as string
        };

        let time = client.timeCalculator.to_ms(action);

        if (!time) {
            await client.method.interactionSend(interaction, {
                content: lang.too_new_account_invalid_time_on_enable
            });
            return;
        };

        await client.db.set(`${interaction.guildId}.GUILD.CONFESSION.cooldown`, time);
        await client.method.interactionSend(interaction, {
            content: lang.confession_coolodwn_command_work
                .replace('${interaction.user.toString()}', interaction.member.user.toString())
                .replace('${client.timeCalculator.to_beautiful_string(time)}', client.timeCalculator.to_beautiful_string(time, lang))
        });

        await client.method.iHorizonLogs.send(interaction, {
            title: lang.confession_cooldown_log_embed_title,
            description: lang.confession_cooldown_log_embed_desc
                .replace('${interaction.user}', interaction.member.user.toString())
                .replace('${client.timeCalculator.to_beautiful_string(time)}', client.timeCalculator.to_beautiful_string(time, lang))
        });

        return;
    },
};
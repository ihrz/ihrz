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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    GuildMember,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { generatePassword } from '../../../core/functions/random.js';
import { format } from '../../../core/functions/date_and_time.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("member") as GuildMember | null;
        } else {

            var member = client.func.method.member(interaction, args!, 0) as GuildMember | null;
        };

        let allWarns: DatabaseStructure.WarnsData[] | null = await client.db.get(`${interaction.guildId}.USER.${member?.id}.WARNS`);

        if (!allWarns || allWarns.length === 0) {
            await client.func.method.interactionSend(interaction, {
                content: lang.warnlist_no_data
                    .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                    .replace("${member?.toString()}", member?.toString()!)
            })
            return;
        }

        // delete all warns
        await client.db.delete(`${interaction.guildId}.USER.${member?.id}.WARNS`);

        await client.func.method.interactionSend(interaction, {
            content: lang.clearwarn_command_ok
                .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                .replace("${member?.toString()}", member?.toString()!)
                .replace("${allWarns.length}", allWarns.length.toString())
                .replace("${interaction.member.toString()}", interaction.member.toString())
        });

        return;
    },
};
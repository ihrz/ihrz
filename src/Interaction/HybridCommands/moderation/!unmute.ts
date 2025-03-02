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
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;;

        if (interaction instanceof ChatInputCommandInteraction) {
            var tomute = interaction.options.getMember("user") as GuildMember | null;
        } else {
            
            var tomute = client.func.method.member(interaction, args!, 0) as GuildMember | null;
        };

        if (!tomute) return;

        if (!interaction.guild.members.me?.permissions.has([PermissionsBitField.Flags.ManageRoles])) {
            await client.func.method.interactionSend(interaction, {
                content: lang.unmute_i_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;;
        };

        if (tomute?.id === interaction.member.user.id) {
            await client.func.method.interactionSend(interaction, {
                content: lang.unmute_attempt_mute_your_self.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;;
        };

        if (!tomute?.isCommunicationDisabled() === true) {
            await client.func.method.interactionSend(interaction, { content: lang.unmute_not_muted });
            return;;
        };

        tomute.disableCommunicationUntil(Date.now());

        await client.func.method.interactionSend(interaction, {
            content: lang.unmute_command_work
                .replace("${tomute.id}", tomute.id)
        });

        await client.func.ihorizon_logs(interaction, {
            title: lang.unmute_logs_embed_title,
            description: lang.unmute_logs_embed_description
                .replace("${interaction.user.id}", interaction.member.user.id)
                .replace("${tomute.id}", tomute.id)
        });
    },
};
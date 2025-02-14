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
    ActionRowBuilder,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    Message,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { promptYesOrNo } from '../../../core/functions/awaitingResponse.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var user = interaction.options.getMember("user") as GuildMember || interaction.member;
        } else {

            var user = client.method.member(interaction, args!, 0) || interaction.member;
        };

        let a = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(lang.removeinvites_not_admin_embed_description);

        let response = await promptYesOrNo(interaction, {
            content: lang.reset_uranks_are_you_sure,
            noButton: lang.resetallinvites_no_button,
            yesButton: lang.resetallinvites_yes_button,
            dangerAction: true
        })

        if (response) {
            await client.db.delete(`${interaction.guildId}.USER.${user.id}.XP_LEVELING`);
            await client.method.interactionSend(interaction, { content: lang.resetallinvites_succes_on_delete, components: [] });

            await client.method.iHorizonLogs.send(interaction, {
                title: lang.resetallinvites_logs_embed_title,
                description: lang.reset_uranks_logs_embed_desc
                    .replace("${interaction.member.user.toString()}", interaction.member.user.toString())
                    .replace("${user.toString()}", user.toString())
            });

        } else {
            await client.method.interactionSend(interaction, { content: lang.setjoinroles_action_canceled, components: [] });
        }
    },
};
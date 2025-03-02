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
    GuildMember,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    PermissionsBitField,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var user = interaction.options.getMember("member") as GuildMember;
            var amount = interaction.options.getNumber("amount")!;
        } else {
            
            var user = client.func.method.member(interaction, args!, 0) || interaction.member;
            var amount = client.func.method.number(args!, 1);
        };

        let a = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(lang.removeinvites_not_admin_embed_description);

        let check = await client.db.get(`${interaction?.guild?.id}.USER.${user.id}.INVITES`);

        if (check) {
            await client.db.sub(`${interaction.guildId}.USER.${user.id}.INVITES.invites`, amount!);
            await client.db.sub(`${interaction.guildId}.USER.${user.id}.INVITES.bonus`, amount!);
        } else {

            await client.db.set(`${interaction?.guild?.id}.USER.${user.id}.INVITES`,
                {
                    regular: 0, bonus: 0, leaves: 0, invites: 0
                }
            );
            await client.db.sub(`${interaction.guildId}.USER.${user.id}.INVITES.invites`, amount!);
            await client.db.sub(`${interaction.guildId}.USER.${user.id}.INVITES.bonus`, amount!);
        };

        let finalEmbed = new EmbedBuilder()
            .setDescription(lang.removeinvites_confirmation_embed_description
                .replace(/\${amount}/g, amount.toString())
                .replace(/\${user}/g, user.toString()!)
            )
            .setColor(`#92A8D1`)
            .setFooter({ text: interaction.guild.name as string, iconURL: interaction.guild.iconURL() as string });

        await client.func.method.interactionSend(interaction, { embeds: [finalEmbed] });

        await client.func.ihorizon_logs(interaction, {
            title: lang.removeinvites_logs_embed_title,
            description: lang.removeinvites_logs_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
                .replace(/\${amount}/g, amount.toString())
                .replace(/\${user\.id}/g, user.id)
        });
    },
};
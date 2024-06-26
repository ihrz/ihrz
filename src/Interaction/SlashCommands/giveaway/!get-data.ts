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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    time
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.editReply({ content: data.end_not_admin });
            return;
        };

        let giveawayId = interaction.options.getString("giveaway-id")!;
        let giveawayData = await client.giveawaysManager.getGiveawayData(giveawayId);

        let embed = new EmbedBuilder()
            .setAuthor({
                name: interaction.guild.name as string,
                iconURL: interaction.guild.iconURL({ size: 512, forceStatic: false })!
            })
            .setColor("#0099ff")
            .setTitle(data.gw_getdata_embed_title)
            .setFields(
                {
                    name: data.gw_getdata_embed_fields_channel,
                    value: `<#${giveawayData.channelId}>`,
                    inline: true
                },
                {
                    name: data.gw_getdata_embed_fields_amountWinner,
                    value: data.gw_getdata_embed_fields_value_amountWinner
                        .replace('${giveawayData.winnerCount}', giveawayData.winnerCount),
                    inline: true
                },
                {
                    name: data.gw_getdata_embed_fields_prize,
                    value: data.gw_getdata_embed_fields_value_prize
                        .replace('${giveawayData.prize}', giveawayData.prize),
                    inline: true
                },
                {
                    name: data.gw_getdata_embed_fields_hostedBy,
                    value: `<@${giveawayData.hostedBy}>`,
                    inline: true
                },
                {
                    name: data.gw_getdata_embed_fields_isEnded,
                    value: giveawayData.ended ? data.gw_getdata_yes : data.gw_getdata_no,
                    inline: true
                },
                {
                    name: data.gw_getdata_embed_fields_isValid,
                    value: giveawayData.isValid ? data.gw_getdata_yes : data.gw_getdata_no,
                    inline: true
                },
                {
                    name: data.gw_getdata_embed_fields_time,
                    value: time(new Date(giveawayData.expireIn), 'd'),
                    inline: true
                },
                {
                    name: data.gw_getdata_embed_fields_entriesAmount,
                    value: data.gw_getdata_embed_fields_value_entriesAmount
                        .replace('${(giveawayData.entries as string[]).length}', (giveawayData.entries as string[]).length.toString())
                        .replace('${giveawayId}', giveawayId)
                },
            )

        if (giveawayData.ended) {
            embed.addFields(
                {
                    name: data.gw_getdata_embed_fields_winners,
                    value: `${giveawayData.winners.map((x: string) => `<@${x}>`)}`
                }
            )
        }
        await interaction.editReply({ embeds: [embed] });
        return;
    },
};
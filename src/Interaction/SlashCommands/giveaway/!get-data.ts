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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    time
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.editReply({ content: data.end_not_admin });
            return;
        };

        let giveawayId = interaction.options.getString("giveaway-id");
        let giveawayData = client.giveawaysManager.getGiveawayData(giveawayId as string);

        let embed = new EmbedBuilder()
            .setAuthor({
                name: interaction.guild?.name as string,
                iconURL: interaction.guild?.iconURL({ size: 512, forceStatic: false }) as string
            })
            .setColor("#0099ff")
            .setTitle("Giveaway Info!")
            .setFields(
                {
                    name: "Channel",
                    value: `<#${giveawayData.channelId}>`,
                    inline: true
                },
                {
                    name: "Winners Amount",
                    value: `\`${giveawayData.winnerCount}\` winner(s)`,
                    inline: true
                },
                {
                    name: "Entries Amount",
                    value: `**${(giveawayData.entries as string[]).length}** (use \`/gw list-entries\` for more info)`
                },
                {
                    name: "Prize",
                    value: `\`${giveawayData.prize}\``,
                    inline: true
                },
                {
                    name: "Hosted by",
                    value: `<@${giveawayData.hostedBy}>`,
                    inline: true
                },
                {
                    name: "Is Ended ?",
                    value: giveawayData.ended ? "`Yes`" : "`No`",
                    inline: true
                },
                {
                    name: "Is Valid ?",
                    value: giveawayData.isValid ? "`Yes`" : "`No`",
                    inline: true
                },
                {
                    name: "End at",
                    value: time(new Date(giveawayData.expireIn), 'd'),
                    inline: true
                },
            )

        if (giveawayData.ended) {
            embed.addFields(
                {
                    name: "Winner(s)",
                    value: `${giveawayData.winners.map((x: string) => `<@${x}>`)}`
                }
            )
        }
        await interaction.editReply({ embeds: [embed] });
        return;
    },
};
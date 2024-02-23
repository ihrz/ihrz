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
    ActionRowBuilder,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let unauthorizedMessage = `<@${interaction.user.id}>, you are not authorized to use this command here`;

        if (!interaction.memberPermissions?.has([PermissionsBitField.Flags.Administrator])) {
            await interaction.editReply({ content: unauthorizedMessage });
            return;
        }

        let targetedChannel = interaction.options.getChannel('channel');

        let embed = new EmbedBuilder()
            .setColor(2829617)
            .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
            .setDescription(
                `## TempVoice Interface\n` +
                `This **interface** can be used to manage temporary voice channels.\n`
            )
            .addFields(
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Limit} **Change limit**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Name} **Change Name**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Region} **Change Region**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Trust} **Trust**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `** **`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Untrust} **Untrust**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Block} **Block**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `** **`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Unblock} **Unblock**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Claim} **Claim**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Privacy} **Privacy**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Transfer} **Transfer**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `** **`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `${client.iHorizon_Emojis.vc.Delete} **Delete**`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `** **`,
                    inline: true
                },
            )
            .setFooter({
                text: 'iHorizon',
                iconURL: client.user?.displayAvatarURL({ size: 1024 }) as string
            });

        let buttonRows = [
            [
                { emoji: client.iHorizon_Emojis.vc.Limit, customId: 'temporary_voice_limit_button' },
                { emoji: client.iHorizon_Emojis.vc.Name, customId: 'temporary_voice_name_button' },
                { emoji: client.iHorizon_Emojis.vc.Claim, customId: 'temporary_voice_claim_button' },
                { emoji: client.iHorizon_Emojis.vc.Privacy, customId: 'temporary_voice_privacy_button' },
                { emoji: client.iHorizon_Emojis.vc.Region, customId: 'temporary_voice_region_button' },
            ],
            [
                { emoji: client.iHorizon_Emojis.vc.Trust, customId: 'temporary_voice_trust_button' },
                { emoji: client.iHorizon_Emojis.vc.Block, customId: 'temporary_voice_block_button' },
                { emoji: client.iHorizon_Emojis.vc.Transfer, customId: 'temporary_voice_transfer_button' },
                { emoji: client.iHorizon_Emojis.vc.Unblock, customId: 'temporary_voice_unblock_button' },
                { emoji: client.iHorizon_Emojis.vc.Untrust, customId: 'temporary_voice_untrust_button' },
            ],
            [
                { emoji: client.iHorizon_Emojis.icon.iHorizon_Empty, customId: 'temporary_voice_disable1_button', disabled: true },
                { emoji: client.iHorizon_Emojis.icon.iHorizon_Empty, customId: 'temporary_voice_disable2_button', disabled: true },
                { emoji: client.iHorizon_Emojis.vc.Delete, customId: 'temporary_voice_delete_button' },
                { emoji: client.iHorizon_Emojis.icon.iHorizon_Empty, customId: 'temporary_voice_disable3_button', disabled: true },
                { emoji: client.iHorizon_Emojis.icon.iHorizon_Empty, customId: 'temporary_voice_disable4_button', disabled: true },
            ]
        ];

        let components = buttonRows.map(row =>
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                ...row.map(button =>
                    new ButtonBuilder()
                        .setEmoji(button.emoji)
                        .setCustomId(button.customId)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(button.disabled || false)
                )
            )
        );

        let response = await (targetedChannel as BaseGuildTextChannel).send({ embeds: [embed], components });

        await interaction.editReply({ content: `${client.iHorizon_Emojis.icon.Yes_Logo} | ${response.url}` });

        await client.db.set(`${interaction.guildId}.VOICE_INTERFACE.interface`,
            {
                channelId: response.channelId,
                messageId: response.id
            }
        );
    },
};
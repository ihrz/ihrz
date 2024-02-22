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

        if (!interaction.memberPermissions?.has([PermissionsBitField.Flags.Administrator])) {
            await interaction.editReply({
                content: `<@${interaction.user.id}>, your are not authorized to use this commands here`
            });
            return;
        };

        let targetedChannel = interaction.options.getChannel('channel');

        let embed = new EmbedBuilder()
            .setAuthor({
                iconURL: interaction.guild?.iconURL({ size: 1024 }) as string,
                name: `${interaction.guild?.name} - Voice Dashboard`
            })
            .setColor('#ceb6e2')
            .setDescription(`This embed serve t`)
            .setFooter({
                text: 'iHorizon',
                iconURL: client.user?.displayAvatarURL({ size: 1024 }) as string
            })
            .setTimestamp();

        let buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setEmoji("➕")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("temporary_voice_add_button"),
                new ButtonBuilder()
                    .setEmoji("➖")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("temporary_voice_sub_button"),
                new ButtonBuilder()
                    .setEmoji("🗑️")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("temporary_voice_delete_button"),
                new ButtonBuilder()
                    .setEmoji("🏷️")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("temporary_voice_editname_button"),
                new ButtonBuilder()
                    .setEmoji("👀")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("temporary_voice_visible_button")
            )
            ;

        let response = await (targetedChannel as BaseGuildTextChannel).send({
            embeds: [embed],
            components: [buttons]
        })

        await interaction.editReply({
            content: `${client.iHorizon_Emojis.icon.Yes_Logo} | ${response.url}`
        });

        await client.db.set(
            `${interaction.guildId}.VOICE_INTERFACE.all.${response.id}`,
            {
                channelId: response.channelId,
            }
        );

        return;
        // [{ attachment: await guild.client.functions.image64(client.user?.displayAvatarURL({ extension: 'png', forceStatic: false, size: 4096 })), name: 'icon.png' }]
    },
};
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
    ActionRowBuilder,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    TextChannel
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let channel = interaction.options.getChannel("to") as TextChannel;
        let buttonTitle = interaction.options.getString('button-title')?.substring(0, 22) || '+';

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.security_channel_not_admin });
            return;
        };

        await client.db.set(`${interaction.guildId}.CONFESSION.channel`, channel.id);

        await interaction.reply({
            content: data.confession_channel_command_work
                .replace('${channel?.toString()}', channel.toString()!)
        });

        let embed = new EmbedBuilder()
            .setColor('#ff05aa')
            .setFooter({ text: interaction.guild.name!, iconURL: 'attachment://guild_icon.png' })
            .setTimestamp()
            .setDescription(data.confession_channel_panel_embed_desc)
            ;

        let actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setLabel(buttonTitle)
                .setCustomId('new-confession-button')
        )

        let message = await (channel as BaseGuildTextChannel).send({
            embeds: [embed],
            files: [
                {
                    attachment: await interaction.client.func.image64(interaction.guild.iconURL() || client.user.displayAvatarURL()),
                    name: 'guild_icon.png'
                }
            ],
            components: [actionRow]
        });

        await client.db.set(`${interaction.guildId}.GUILD.CONFESSION.panel`, {
            channelId: message.channelId,
            messageId: message.id
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.confession_channel_log_embed_title)
                .setDescription(data.confession_channel_log_embed_desc
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${channel}', channel.toString())
                )

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
            }
        } catch { };

        return;
    },
};
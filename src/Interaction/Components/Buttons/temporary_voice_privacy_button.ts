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

import { ActionRowBuilder, ButtonInteraction, CacheType, ComponentType, EmbedBuilder, GuildMember, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default async function handleButtonInteraction(interaction: ButtonInteraction<CacheType>) {
    let result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
    let table = interaction.client.db.table('TEMP');
    let lang = await interaction.client.functions.getLanguageData(interaction.guildId) as LanguageData;
    let member = interaction.member as GuildMember;
    let targetedChannel = member.voice.channel;
    let getChannelOwner = await table.get(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);

    if (!result) return await interaction.deferUpdate();
    if (result.channelId !== interaction.channelId || getChannelOwner !== targetedChannel?.id) {
        return await interaction.deferUpdate();
    }

    if (!targetedChannel) {
        await interaction.deferUpdate();
        return;
    }

    let comp = new StringSelectMenuBuilder()
        .setCustomId('tempmorary_voice_privacy_menu')
        .setPlaceholder(lang.temporary_voice_privacy_menu_placeholder)
        .addOptions(
            { label: lang.temporary_voice_privacy_menu_lock_label, description: lang.temporary_voice_privacy_menu_lock_desc, emoji: interaction.client.iHorizon_Emojis.vc.CloseAccess, value: 'temporary_channel_lock_channel_menu' },
            { label: lang.temporary_voice_privacy_menu_unlock_label, description: lang.temporary_voice_privacy_menu_unlock_desc, emoji: interaction.client.iHorizon_Emojis.vc.OpenAcces, value: 'temporary_channel_unlock_channel_menu' },
            { label: lang.temporary_voice_privacy_menu_invisible_label, description: lang.temporary_voice_privacy_menu_invisible_desc, emoji: interaction.client.iHorizon_Emojis.vc.Unseeable, value: 'temporary_channel_invisible_channel_menu' },
            { label: lang.temporary_voice_privacy_menu_visible_label, description: lang.temporary_voice_privacy_menu_visible_desc, emoji: interaction.client.iHorizon_Emojis.vc.Seeable, value: 'temporary_channel_visible_channel_menu' },
            { label: lang.temporary_voice_privacy_menu_closechat_label, description: lang.temporary_voice_privacy_menu_closechat_desc, emoji: interaction.client.iHorizon_Emojis.vc.CloseChat, value: 'temporary_channel_closechat_channel_menu' },
            { label: lang.temporary_voice_privacy_menu_openchat_label, description: lang.temporary_voice_privacy_menu_openchat_desc, emoji: interaction.client.iHorizon_Emojis.vc.OpenChat, value: 'temporary_channel_openchat_channel_menu' }
        );

    let response = await interaction.reply({
        ephemeral: true,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(comp)]
    });

    let collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: (u) => u.user.id === interaction.user.id,
        time: 200_000
    });

    collector?.on('collect', async i => {
        let value = i.values[0];
        let action = comp.options.find(option => option.data.value === value)?.data.label;

        if (!action || !i.guild) return;

        let embed = new EmbedBuilder()
            .setDescription(`## Modifications about your temporary voice channel`)
            .setColor(2829617)
            .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await i.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
            .setFooter({ text: "iHorizon", iconURL: 'attachment://icon.png' });

        switch (value) {
            case 'temporary_channel_lock_channel_menu':
            case 'temporary_channel_unlock_channel_menu':
                embed.setFields({
                    name: `${action}`,
                    value: `${value === 'temporary_channel_lock_channel_menu' ? interaction.client.iHorizon_Emojis.vc.CloseAccess : interaction.client.iHorizon_Emojis.vc.OpenAcces} **Yes**`,
                    inline: true
                });
                targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id, { Connect: value === 'temporary_channel_lock_channel_menu' ? false : true, Stream: value === 'temporary_channel_lock_channel_menu' ? false : true, Speak: value === 'temporary_channel_lock_channel_menu' ? false : true });
                break;
            case 'temporary_channel_invisible_channel_menu':
            case 'temporary_channel_visible_channel_menu':
                embed.setFields({ name: `${action}`, value: `${value === 'temporary_channel_invisible_channel_menu' ? interaction.client.iHorizon_Emojis.vc.Unseeable : interaction.client.iHorizon_Emojis.vc.Seeable} **Yes**`, inline: true });
                targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id, { ViewChannel: value === 'temporary_channel_invisible_channel_menu' ? false : true });
                break;
            case 'temporary_channel_closechat_channel_menu':
            case 'temporary_channel_openchat_channel_menu':
                embed.setFields({ name: `${action}`, value: `${value === 'temporary_channel_closechat_channel_menu' ? interaction.client.iHorizon_Emojis.vc.CloseChat : interaction.client.iHorizon_Emojis.vc.OpenChat} **Yes**`, inline: true });
                targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id, { SendMessages: value === 'temporary_channel_closechat_channel_menu' ? false : true, AddReactions: value === 'temporary_channel_closechat_channel_menu' ? false : true, UseApplicationCommands: value === 'temporary_channel_closechat_channel_menu' ? false : true });
                break;
        }

        await i.reply({
            embeds: [embed],
            files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }],
            ephemeral: true
        });
    });

    collector?.on('end', () => {
        response.delete();
    });
};
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

import { ActionRowBuilder, ButtonInteraction, CacheType, ComponentType, EmbedBuilder, Guild, GuildMember, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default async function (interaction: ButtonInteraction<CacheType>) {

    let result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
    let table = interaction.client.db.table('TEMP');

    let lang = await interaction.client.functions.getLanguageData(interaction.guildId) as LanguageData;
    let member = interaction.member as GuildMember;

    let targetedChannel = (interaction.member as GuildMember).voice.channel;
    let getChannelOwner = await table.get(`CUSTOM_VOICE.${interaction.guild?.id}.${interaction.user.id}`);

    if (result.channelId !== interaction.channelId
        || getChannelOwner !== targetedChannel?.id) return interaction.deferUpdate();

    if (!member.voice.channel) {
        await interaction.deferUpdate()
        return;
    } else {

        let comp = new StringSelectMenuBuilder()
            .setCustomId('tempmorary_voice_privacy_menu')
            .setPlaceholder('Select a Privacy Option')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Lock channel')
                    .setDescription('Only trusted users will be able to join your voice channel')
                    .setEmoji(interaction.client.iHorizon_Emojis.vc.CloseAccess)
                    .setValue('temporary_channel_lock_channel_menu'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Unlock channel')
                    .setDescription('Everyone will be able to join your voice channel')
                    .setEmoji(interaction.client.iHorizon_Emojis.vc.OpenAcces)
                    .setValue('temporary_channel_unlock_channel_menu'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Invisible')
                    .setEmoji(interaction.client.iHorizon_Emojis.vc.Unseeable)
                    .setDescription('Only trusted users will be able to view your voice channel')
                    .setValue('temporary_channel_invisible_channel_menu'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Visible')
                    .setEmoji(interaction.client.iHorizon_Emojis.vc.Seeable)
                    .setDescription('Everyone will be able to view your voice channel')
                    .setValue('temporary_channel_visible_channel_menu'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Close chat')
                    .setEmoji(interaction.client.iHorizon_Emojis.vc.CloseChat)
                    .setDescription('Only trusted users will be able to text in your chat')
                    .setValue('temporary_channel_closechat_channel_menu'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Open chat')
                    .setDescription('Everyone will be able to text in your chat')
                    .setEmoji(interaction.client.iHorizon_Emojis.vc.OpenChat)
                    .setValue('temporary_channel_openchat_channel_menu'),
            );

        let response = await interaction.reply({
            ephemeral: true,
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(comp)
            ]
        });

        let collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (u) => u.user.id === interaction.user.id,
            time: 200_000
        });

        collector?.on('collect', async i => {

            let value = i.values[0];
            let action = comp.options.filter(i => i.data.value === value)[0].data.label;

            let embed = new EmbedBuilder()
                .setDescription(`## Modifications about your temporary voice channel`)
                .setColor(2829617)
                .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await i.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
                .setFooter(
                    {
                        text: "iHorizon",
                        iconURL: 'attachment://icon.png'
                    }
                );

            switch (value) {
                // Lock channel
                case 'temporary_channel_lock_channel_menu':

                    embed.setFields(
                        {
                            name: `${action}`,
                            value: `${i.client.iHorizon_Emojis.vc.CloseAccess} **Yes**`,
                            inline: true
                        },
                    );

                    targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id as string,
                        {
                            Connect: false,
                            Stream: false,
                            Speak: false,
                        },
                    );

                    break;
                // Unlock channel
                case 'temporary_channel_unlock_channel_menu':

                    embed.setFields(
                        {
                            name: `${action}`,
                            value: `${i.client.iHorizon_Emojis.vc.OpenAcces} **Yes**`,
                            inline: true
                        },
                    );

                    targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id as string,
                        {
                            Connect: true,
                            Stream: true,
                            Speak: true,
                        },
                    );

                    break;
                // Invisible
                case 'temporary_channel_invisible_channel_menu':

                    embed.setFields(
                        {
                            name: `${action}`,
                            value: `${i.client.iHorizon_Emojis.vc.Unseeable} **Yes**`,
                            inline: true
                        },
                    );

                    targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id as string,
                        {
                            ViewChannel: false
                        },
                    );

                    break;
                // Visible
                case 'temporary_channel_visible_channel_menu':

                    embed.setFields(
                        {
                            name: `${action}`,
                            value: `${i.client.iHorizon_Emojis.vc.Seeable} **Yes**`,
                            inline: true
                        },
                    );

                    targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id as string,
                        {
                            ViewChannel: true
                        },
                    );

                    break;
                // Close chat
                case 'temporary_channel_closechat_channel_menu':

                    embed.setFields(
                        {
                            name: `${action}`,
                            value: `${i.client.iHorizon_Emojis.vc.CloseChat} **Yes**`,
                            inline: true
                        },
                    );

                    targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id as string,
                        {
                            SendMessages: false
                        },
                    );

                    break;
                // Open chat
                case 'temporary_channel_openchat_channel_menu':

                    embed.setFields(
                        {
                            name: `${action}`,
                            value: `${i.client.iHorizon_Emojis.vc.OpenChat} **Yes**`,
                            inline: true
                        },
                    );

                    targetedChannel?.permissionOverwrites.edit(i.guild?.roles.everyone.id as string,
                        {
                            SendMessages: true,
                            AddReactions: true,
                            UseApplicationCommands: true
                        },
                    );

                    break;
            };

            await i.reply({
                embeds: [
                    embed
                ],
                files: [
                    {
                        attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()),
                        name: 'icon.png'
                    }
                ],
                ephemeral: true
            });
        });

        collector?.on('end', i => {
            response.delete();
        })

    }
};
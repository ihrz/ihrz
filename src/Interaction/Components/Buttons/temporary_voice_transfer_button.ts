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

import { ActionRowBuilder, BaseGuildVoiceChannel, ButtonInteraction, CacheType, ComponentType, Embed, EmbedBuilder, GuildMember, UserSelectMenuBuilder } from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default async function (interaction: ButtonInteraction<CacheType>) {

    let result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
    let table = interaction.client.db.table('TEMP');

    let lang = await interaction.client.functions.getLanguageData(interaction.guildId) as LanguageData;
    let member = interaction.member as GuildMember;

    let targetedChannel = (interaction.member as GuildMember).voice.channel;
    let getChannelId = await table.get(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);

    if (!result) return await interaction.deferUpdate();
    if (result.channelId !== interaction.channelId
        || getChannelId !== targetedChannel?.id) return await interaction.deferUpdate();

    if (!member.voice.channel) {
        await interaction.deferUpdate()
        return;
    } else {

        let response = await interaction.reply({
            ephemeral: true,
            components: [
                new ActionRowBuilder<UserSelectMenuBuilder>()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId('temporary_voice_transfer_selectmenue')
                            .setPlaceholder(lang.temporary_voice_transfer_menu_placeholder)
                            .setMinValues(1)
                            .setMaxValues(1)
                    )
            ]
        });

        let collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.UserSelect,
            filter: (u) => u.user.id === interaction.user.id,
            time: 200_000
        });

        collector?.on('collect', async i => {
            // The new owner of the channel
            let newOwner = i.members.first();

            // change ownership now
            await table.delete(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);
            await table.set(`CUSTOM_VOICE.${interaction.guildId}.${newOwner?.user?.id}`, getChannelId)

            // change the voice channel name
            targetedChannel?.setName(`${(newOwner as GuildMember).displayName || newOwner?.user?.username}'s Channel`);

            targetedChannel?.permissionOverwrites.delete(interaction.user.id);
            
            targetedChannel?.permissionOverwrites.edit(newOwner?.user?.id as string, {
                ViewChannel: true,
                Connect: true,
                Stream: true,
                Speak: true,

                SendMessages: true,
                UseApplicationCommands: true,
                AttachFiles: true,
                AddReactions: true
            });

            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(lang.temporary_voice_title_embec)
                        .setColor(2829617)
                        .setFields(
                            {
                                name: lang.temporary_voice_new_member,
                                value: `<@${newOwner?.user?.id}>`
                            },
                            {
                                name: lang.temporary_voice_old_member,
                                value: `<@${interaction.user.id}>`
                            },
                        )
                        .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await i.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
                        .setFooter(
                            {
                                text: "iHorizon",
                                iconURL: 'attachment://icon.png'
                            }
                        )
                ],
                files: [
                    {
                        attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()),
                        name: 'icon.png'
                    }
                ],
                ephemeral: true
            });

            collector?.stop();
        });

        collector?.on('end', i => {
            response.delete();
        })
    }
};
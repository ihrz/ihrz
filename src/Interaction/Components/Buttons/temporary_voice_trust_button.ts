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
    let lang = await interaction.client.functions.getLanguageData(interaction.guildId) as LanguageData;
    let member = interaction.member as GuildMember;

    if (result.channelId !== interaction.channelId) return interaction.deferReply();

    if (!member.voice.channel) {
        await interaction.deferUpdate()
        return;
    } else {

        let comp = new ActionRowBuilder<UserSelectMenuBuilder>()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('temporary_voice_trust_selectmenue')
                    .setPlaceholder(`Selected users will be trusted to join`)
                    .setMinValues(0)
                    .setMaxValues(10)
            );

        let response = await interaction.reply({
            ephemeral: true,
            components: [comp]
        });

        let collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.UserSelect,
            filter: (u) => u.user.id === interaction.user.id,
            time: 200_000
        });

        collector?.on('collect', async i => {
            let membersArray: string[] = [];
            let listmembersArray: string[] = [];

            let targetedChannel = (interaction.member as GuildMember).voice.channel;

            // Push all the member of the Selection on the Array
            i.members.each(async (i) => { membersArray.push(i.user?.id as string) });

            // Push all current Allowed users into the Array
            targetedChannel?.permissionOverwrites.cache.filter((i) => i.type === 1).each((i) => {
                listmembersArray.push(i.id)
            });

            // Declare the array
            let addedMembers: string[] = [];
            let removedMembers: string[] = [];

            // Remove member if are delete from the SelectMenu
            listmembersArray.forEach(async (overwriteId) => {
                if (!membersArray.includes(overwriteId) && i.user.id !== overwriteId) {
                    removedMembers.push(overwriteId);
                    await (targetedChannel as BaseGuildVoiceChannel).permissionOverwrites.delete(overwriteId);
                }
            });

            // Add member if are added from the SelectMenu
            membersArray.forEach(async (memberId) => {
                if (!listmembersArray.includes(memberId)) {
                    (targetedChannel as BaseGuildVoiceChannel).permissionOverwrites.edit(memberId,
                        {
                            Connect: true,
                            Speak: true,
                            Stream: true,

                            SendMessages: true,
                            ReadMessageHistory: true,
                            AttachFiles: true
                        }
                    );
                    addedMembers.push(memberId);
                };
            });

            let e = new EmbedBuilder()
                .setDescription(`## Modifications about your temporary voice channel`)
                .setColor(2829617)
                .setFields(
                    {
                        name: "Untrusted members",
                        value: removedMembers.map((memberId) => `<@${memberId}>`).join(' ') || 'No one'
                    },
                    {
                        name: "Trusted members",
                        value: addedMembers.map((memberId) => `<@${memberId}>`).join(' ') || 'No one'
                    },
                )
                .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await i.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`)}.png`)
                .setFooter(
                    {
                        text: "iHorizon",
                        iconURL: 'attachment://icon.png'
                    }
                );

            await i.reply({
                embeds: [e],
                files: [
                    {
                        attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()),
                        name: 'icon.png'
                    }
                ]
            });

            collector?.stop();
        });

        collector?.on('end', i => {
            response.delete();
        })

    }
};
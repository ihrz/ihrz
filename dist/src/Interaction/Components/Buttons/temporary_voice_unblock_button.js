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
import { ActionRowBuilder, ComponentType, EmbedBuilder, UserSelectMenuBuilder } from 'discord.js';
export default async function (interaction) {
    let result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
    let table = interaction.client.db.table('TEMP');
    let lang = await interaction.client.func.getLanguageData(interaction.guildId);
    let member = interaction.member;
    let targetedChannel = interaction.member.voice.channel;
    let getChannelOwner = await table.get(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);
    if (!result)
        return await interaction.deferUpdate();
    if (result.channelId !== interaction.channelId
        || getChannelOwner !== targetedChannel?.id)
        return await interaction.deferUpdate();
    if (!member.voice.channel) {
        await interaction.deferUpdate();
        return;
    }
    else {
        let response = await interaction.reply({
            ephemeral: true,
            components: [
                new ActionRowBuilder()
                    .addComponents(new UserSelectMenuBuilder()
                    .setCustomId('temporary_voice_trust_selectmenue')
                    .setPlaceholder(lang.temporary_voice_transfer_unblocked_placeholder)
                    .setMinValues(0)
                    .setMaxValues(10))
            ]
        });
        let collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.UserSelect,
            filter: (u) => u.user.id === interaction.user.id,
            time: 200_000
        });
        collector?.on('collect', async (i) => {
            let membersArray = [];
            let listmembersArray = [];
            // Push all the member of the Selection on the Array
            i.members.each(async (i) => { membersArray.push(i.user?.id); });
            // Push all current Allowed users into the Array
            targetedChannel?.permissionOverwrites.cache.filter((i) => i.type === 1).each((i) => {
                listmembersArray.push(i.id);
            });
            // Declare the array
            let addedMembers = [];
            let removedMembers = [];
            // Remove member if are delete from the SelectMenu
            listmembersArray.forEach(async (overwriteId) => {
                if (!membersArray.includes(overwriteId) && i.user.id !== overwriteId) {
                    removedMembers.push(overwriteId);
                    await targetedChannel.permissionOverwrites.delete(overwriteId);
                }
            });
            // Add member if are added from the SelectMenu
            membersArray.forEach(async (memberId) => {
                if (!listmembersArray.includes(memberId)) {
                    targetedChannel.permissionOverwrites.edit(memberId, {
                        ViewChannel: true,
                        SendMessages: false,
                        AddReactions: false,
                        Connect: false,
                        Speak: false
                    });
                    addedMembers.push(memberId);
                }
                ;
            });
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(lang.temporary_voice_title_embec)
                        .setColor(2829617)
                        .setFields({
                        name: lang.temporary_voice_unblocked_member,
                        value: addedMembers.map((memberId) => `<@${memberId}>`).join(' ') || lang.temporary_voice_no_one
                    }, {
                        name: lang.temporary_voice_blocked_mmeber,
                        value: removedMembers.map((memberId) => `<@${memberId}>`).join(' ') || lang.temporary_voice_no_one
                    })
                        .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await i.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'fr-FR'}.png`)
                        .setFooter(await interaction.client.method.bot.footerBuilder(interaction))
                ],
                files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)],
                ephemeral: true
            });
            collector?.stop();
        });
        collector?.on('end', i => {
            response.delete();
        });
    }
}
;

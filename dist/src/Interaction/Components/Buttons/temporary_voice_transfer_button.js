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
    let getChannelId = await table.get(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);
    if (!result)
        return await interaction.deferUpdate();
    if (result.channelId !== interaction.channelId
        || getChannelId !== targetedChannel?.id)
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
                    .setCustomId('temporary_voice_transfer_selectmenue')
                    .setPlaceholder(lang.temporary_voice_transfer_menu_placeholder)
                    .setMinValues(1)
                    .setMaxValues(1))
            ]
        });
        let collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.UserSelect,
            filter: (u) => u.user.id === interaction.user.id,
            time: 200_000
        });
        collector?.on('collect', async (i) => {
            // The new owner of the channel
            let newOwner = i.members.first();
            // change ownership now
            await table.delete(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);
            await table.set(`CUSTOM_VOICE.${interaction.guildId}.${newOwner?.user?.id}`, getChannelId);
            // change the voice channel name
            targetedChannel?.setName(lang.temporary_voice_channel_name.replace("{nicker}", `${newOwner?.displayName || newOwner?.user?.username}`));
            targetedChannel?.permissionOverwrites.delete(interaction.user.id);
            targetedChannel?.permissionOverwrites.edit(newOwner?.user?.id, {
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
                        .setFields({
                        name: lang.temporary_voice_new_member,
                        value: `<@${newOwner?.user?.id}>`
                    }, {
                        name: lang.temporary_voice_old_member,
                        value: `<@${interaction.user.id}>`
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

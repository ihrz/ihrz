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

import { ActionRowBuilder, BaseGuildVoiceChannel, ButtonInteraction, CacheType, Client, ComponentType, Embed, EmbedBuilder, Guild, GuildMember, UserSelectMenuBuilder } from 'pwss';
import { LanguageData } from '../../../../types/languageData';

export default async function (interaction: ButtonInteraction<CacheType>) {

    let result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
    let table = interaction.client.db.table('TEMP');

    let lang = await interaction.client.func.getLanguageData(interaction.guildId) as LanguageData;
    let member = interaction.member as GuildMember;

    let targetedChannel = (interaction.member as GuildMember).voice.channel;
    let allChannel = await table.get(`CUSTOM_VOICE.${interaction.guildId}`);

    if (!result || !allChannel) return await interaction.deferUpdate();
    if (result.channelId !== interaction.channelId) return await interaction.deferUpdate();

    function getPreviousOwner(guild: Guild): GuildMember | undefined {
        var result = '';

        for (let [userId, channelId] of Object.entries(allChannel)) {
            if (channelId !== targetedChannel?.id) continue;
            result = userId;
        };

        return guild?.members.cache.get(result);
    };

    let previousOwner = getPreviousOwner(interaction.guild!);

    // Check if the previous owner is in their channel
    if (targetedChannel?.members.get(previousOwner?.id!)) return await interaction.deferUpdate();

    if (!member.voice.channel) {
        await interaction.deferUpdate()
        return;
    } else {

        // change ownership now
        await table.delete(`CUSTOM_VOICE.${interaction.guildId}.${previousOwner?.user.id}`);
        await table.set(`CUSTOM_VOICE.${interaction.guildId}.${interaction?.user?.id}`, targetedChannel?.id)

        // change the voice channel name
        targetedChannel?.setName(`${interaction.user.displayName || interaction.user.username}'s Channel`);

        targetedChannel?.permissionOverwrites.delete(previousOwner?.user.id as string);

        targetedChannel?.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
            Connect: true,
            Stream: true,
            Speak: true,

            SendMessages: true,
            UseApplicationCommands: true,
            AttachFiles: true,
            AddReactions: true
        });

        await interaction.reply({
            ephemeral: true,
            embeds: [new EmbedBuilder()
                .setDescription(lang.temporary_voice_title_embec)
                .setColor(2829617)
                .setFields(
                    {
                        name: lang.temporary_voice_new_member,
                        value: `<@${interaction?.user?.id}>`
                    },
                    {
                        name: lang.temporary_voice_old_member,
                        value: `<@${previousOwner?.id}>`
                    },
                )
                .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await interaction.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
                .setFooter(
                    {
                        text: await interaction.client.func.displayBotName(interaction.guildId),
                        iconURL: 'attachment://icon.png'
                    }
                )
            ],
            files: [
                {
                    attachment: await interaction.client.func.image64(interaction.client.user?.displayAvatarURL()),
                    name: 'icon.png'
                }
            ],
        });
    }
};
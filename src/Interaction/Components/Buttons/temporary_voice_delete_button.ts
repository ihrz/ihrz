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

import { ActionRowBuilder, BaseGuildVoiceChannel, ButtonInteraction, CacheType, ComponentType, Embed, EmbedBuilder, GuildMember, UserSelectMenuBuilder } from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';

export default async function (interaction: ButtonInteraction<"cached">) {

    let result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
    let table = interaction.client.db.table('TEMP');

    let targetedChannel = (interaction.member as GuildMember).voice.channel;

    let lang = await interaction.client.func.getLanguageData(interaction.guildId);
    let member = interaction.member as GuildMember;

    let getChannelOwner = await table.get(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);

    if (!result) return interaction.deferUpdate();
    if (result.channelId !== interaction.channelId
        || getChannelOwner !== targetedChannel?.id) return await interaction.deferUpdate();

    if (!member.voice.channel) {
        await interaction.deferUpdate()
        return;
    } else {

        await targetedChannel?.delete();
        await table.delete(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        lang.temporary_voice_delete_button_desc_embed
                    )
                    .setColor(2829617)
                    .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await interaction.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
                    .setFooter(await interaction.client.func.displayBotName.footerBuilder(interaction))
            ],
            files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)],
            ephemeral: true
        });
    }
};
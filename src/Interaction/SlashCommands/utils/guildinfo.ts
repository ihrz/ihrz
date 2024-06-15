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
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVerificationLevel,
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'guildinfo',

    description: 'Get information about the server!',
    description_localizations: {
        "fr": "Obtenir des informations sur le serveur"
    },

    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        let verlvl = {
            0: data.serverinfo_verlvl_NONE,
            1: data.serverinfo_verlvl_LOW,
            2: data.serverinfo_verlvl_MEDIUM,
            3: data.serverinfo_verlvl_HIGHT,
            4: data.serverinfo_verlvl_VERY_HIGHT
        };

        let embeds = new EmbedBuilder()
            .setColor("#C3B2A1")
            .setAuthor({
                name: data.serverinfo_embed_author
                    .replace(/\${interaction\.guild\.name}/g, interaction.guild?.name!)
                , iconURL: interaction.guild?.iconURL() as string
            })
            .setDescription(data.serverinfo_embed_description
                .replace(/\${interaction\.guild\.description}/g, interaction.guild?.description || 'None'))
            .addFields(
                { name: data.serverinfo_embed_fields_name, value: `\`${interaction.guild?.name}\``, inline: true },
                { name: data.serverinfo_embed_fields_members, value: `\`${interaction.guild?.memberCount}\``, inline: true },
                { name: data.serverinfo_embed_fields_id, value: `\`${interaction.guildId}\``, inline: true },
                { name: data.serverinfo_embed_fields_owner, value: `\<@${interaction.guild?.ownerId}>`, inline: true },
                { name: data.serverinfo_embed_fields_verlvl, value: `\`${verlvl[interaction.guild?.verificationLevel as GuildVerificationLevel]}\``, inline: true },
                { name: data.serverinfo_embed_fields_region, value: `\`${interaction.guild?.preferredLocale}\``, inline: true },
                { name: data.serverinfo_embed_fields_roles, value: `\`${interaction.guild?.roles.cache.size}\``, inline: true },
                { name: data.serverinfo_embed_fields_channels, value: `\`${interaction.guild?.channels.cache.size}\``, inline: true },
                { name: data.serverinfo_embed_fields_joinat, value: `\`${(interaction.member as GuildMember)?.joinedAt}\``, inline: true },
                { name: data.serverinfo_embed_fields_createat, value: `\`${interaction.guild?.createdAt}\``, inline: true }
            )
            .setFooter({ text: `iHorizon`, iconURL: "attachment://icon.png" })
            .setTimestamp()
            .setThumbnail(interaction.guild?.iconURL() as string)
            .setImage(`https://cdn.discordapp.com/icons/${interaction.guildId}/${interaction.guild?.banner}.png`);

        await interaction.reply({
            embeds: [embeds],
            files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
        });
        return;
    },
};
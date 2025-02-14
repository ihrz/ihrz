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

import {
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVerificationLevel,
    Message,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;
        let verlvl = {
            0: lang.serverinfo_verlvl_NONE,
            1: lang.serverinfo_verlvl_LOW,
            2: lang.serverinfo_verlvl_MEDIUM,
            3: lang.serverinfo_verlvl_HIGHT,
            4: lang.serverinfo_verlvl_VERY_HIGHT
        };

        let embeds = new EmbedBuilder()
            .setColor("#C3B2A1")
            .setAuthor({
                name: lang.serverinfo_embed_author
                    .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                , iconURL: interaction.guild?.iconURL() as string
            })
            .setDescription(lang.serverinfo_embed_description
                .replace(/\${interaction\.guild\.description}/g, interaction.guild.description || 'None'))
            .addFields(
                { name: lang.serverinfo_embed_fields_name, value: `\`${interaction.guild.name}\``, inline: true },
                { name: lang.serverinfo_embed_fields_members, value: `\`${interaction.guild.memberCount}\``, inline: true },
                { name: lang.serverinfo_embed_fields_id, value: `\`${interaction.guildId}\``, inline: true },
                { name: lang.serverinfo_embed_fields_owner, value: `\<@${interaction.guild.ownerId}>`, inline: true },
                { name: lang.serverinfo_embed_fields_verlvl, value: `\`${verlvl[interaction.guild.verificationLevel as GuildVerificationLevel]}\``, inline: true },
                { name: lang.serverinfo_embed_fields_region, value: `\`${interaction.guild.preferredLocale}\``, inline: true },
                { name: lang.serverinfo_embed_fields_roles, value: `\`${interaction.guild.roles.cache.size}\``, inline: true },
                { name: lang.serverinfo_embed_fields_channels, value: `\`${interaction.guild.channels.cache.size}\``, inline: true },
                { name: lang.serverinfo_embed_fields_joinat, value: `\`${(interaction.member as GuildMember)?.joinedAt}\``, inline: true },
                { name: lang.serverinfo_embed_fields_createat, value: `\`${interaction.guild.createdAt}\``, inline: true }
            )
            .setFooter(await client.method.bot.footerBuilder(interaction))
            .setTimestamp()
            .setThumbnail(interaction.guild.iconURL())
            .setImage(`https://cdn.discordapp.com/icons/${interaction.guildId}/${interaction.guild?.banner}.png`);

        await client.method.interactionSend(interaction, {
            embeds: [embeds],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};
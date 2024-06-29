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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    Message,
    GuildMember,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';
import { DatabaseStructure } from '../../../../types/database_structure';

const itemsPerPage = 5;
import { SubCommandArgumentValue } from '../../../core/functions/arg';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var backupID = interaction.options.getString('backup-id');
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!); if (!_) return;
            var backupID = client.args.string(args!, 0);
        };

        if (backupID && !await client.db.get(`BACKUPS.${interaction.member.user.id}.${backupID}`)) {
            await client.args.interactionEdit(interaction, {
                content: data.backup_this_is_not_your_backup.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        let data2 = await client.db.get(`BACKUPS.${interaction.member.user.id}`) as DatabaseStructure.DbBackupsUserObject;
        let backups = [];

        for (let i in data2) {
            let result = data2[i];

            let v = (data.backup_string_see_another_v
                .replace('${result.categoryCount}', result.categoryCount.toString())
                .replace('${result.channelCount}', result.channelCount.toString()));

            if (result) backups.push({ name: `${result.guildName} - (||${i}||)`, value: v });
        };

        const totalPages = Math.ceil(backups.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page: number) => {
            let embed = new EmbedBuilder()
                .setDescription(data.backup_all_of_your_backup)
                .setAuthor({ name: interaction.member?.user.username || (interaction.member as GuildMember)?.displayName, iconURL: "attachment://user_icon.png" })
                .setColor("#bf0bb9")
                .setTimestamp();

            let start = page * itemsPerPage;
            let end = start + itemsPerPage;
            let currentBackups = backups.slice(start, end);

            currentBackups.forEach(backup => embed.addFields(backup));

            embed.setFooter({
                text: data.prevnames_embed_footer_text
                    .replace("${currentPage + 1}", String(page + 1))
                    .replace("${pages.length}", String(totalPages)),
                iconURL: "attachment://bot_icon.png"
            });
            return embed;
        };

        const generateButtons = (page: number) => {
            return new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('<<')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('>>')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );
        };

        const originalResponse = await client.args.interactionSend(interaction, {
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)],
            files: [
                { attachment: await interaction.client.func.image64(interaction.client.user.displayAvatarURL()), name: 'bot_icon.png' },
                { attachment: await interaction.client.func.image64((interaction.member as GuildMember).user.displayAvatarURL()), name: 'user_icon.png' }
            ]
        });

        const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'previous') {
                currentPage--;
            } else if (i.customId === 'next') {
                currentPage++;
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            originalResponse.edit({ components: [] });
        });

        return;
    },
};
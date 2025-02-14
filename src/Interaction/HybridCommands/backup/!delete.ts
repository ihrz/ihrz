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
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';

import backup from "discord-rebackup";
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;


        if (interaction instanceof ChatInputCommandInteraction) {
            var backupID = interaction.options.getString('backup-id') as string;
        } else {
            
            var backupID = client.method.string(args!, 0) as string;
        };

        if (backupID && !await client.db.get(`BACKUPS.${interaction.member.user.id}.${backupID}`)) {
            await client.method.interactionSend(interaction, {
                content: lang.backup_this_is_not_your_backup.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        let data_2 = await client.db.get(`BACKUPS.${interaction.member.user.id}.${backupID}`);

        if (!data_2) {
            await client.method.interactionSend(interaction, { content: lang.backup_backup_doesnt_exist });
            return;
        };

        let em = new EmbedBuilder()
            .setTitle(lang.backup_really_want
                .replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
            )
            .setColor("#ff1100")
            .setTimestamp()
            .addFields({
                name: `${data_2.guildName} - (||${backupID}||)`,
                value: lang.backup_string_see_v
                    .replace('${data.categoryCount}', data_2.categoryCount)
                    .replace('${data.channelCount}', data_2.channelCount)
            });

        var delete_button = new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🗑️")
            .setCustomId("backup-trash-button")
            .setLabel(lang.backup_confirm_button);

        var cancel_button = new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setEmoji(client.iHorizon_Emojis.icon.Warning_Icon)
            .setCustomId("backup-cancel-button")
            .setLabel(lang.backup_cancel_button);

        var components = new ActionRowBuilder<ButtonBuilder>().addComponents(delete_button).addComponents(cancel_button);
        let messageEmbed = await client.method.interactionSend(interaction, { embeds: [em], components: [components] });

        let collector = messageEmbed.createMessageComponentCollector({
            filter: async (i) => {
                await i.deferUpdate();
                return interaction.member?.user.id === i.user.id;
            }, time: 15000
        });

        var used = false;

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'backup-trash-button') {
                used = true;

                backup.remove(backupID);
                await client.db.delete(`BACKUPS.${interaction.user.id}.${backupID}`);

                em.setTitle(lang.backup_embed_title_succefully_deleted
                    .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                );
                em.setColor("#6aa84f");
                messageEmbed.edit({ embeds: [em], components: [] });
            } else if (interaction.customId === 'backup-cancel-button') {
                used = true

                em.setTitle(lang.backup_embed_title_cancel_deletion
                    .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                );
                em.setColor("#0460a5");
                messageEmbed.edit({ embeds: [em], components: [] });
            }
        });

        collector.on('end', () => {
            if (used) return;

            em.setTitle(lang.backup_embed_title_timesup_deletion
                .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            );
            em.setColor("#ce7e00");
            messageEmbed.edit({ embeds: [em], components: [] });
        });
        return;
    },
};
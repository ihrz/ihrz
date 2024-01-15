/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

import backup from 'discord-backup';

export const command: Command = {

    name: "backup-list",

    description: "List your backup(s)!",
    description_localizations: {
        "fr": "Listé toute vos backup(s)"
    },

    thinking: false,
    category: 'backup',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        let backupID = args[0];

        if (backupID && !await client.db.get(`BACKUPS.${interaction.author.id}.${backupID}`)) {
            await interaction.reply({
                content: data.backup_this_is_not_your_backup.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (backupID) {
            let data = await client.db.get(`BACKUPS.${interaction.author.id}.${backupID}`);

            if (!data) {
                await interaction.reply({ content: data.backup_backup_doesnt_exist });
                return;
            };

            let em = new EmbedBuilder().setColor("#bf0bb9").setTimestamp().addFields({
                name: `${data.guildName} - (||${backupID}||)`,
                value: (data.backup_string_see_v
                    .replace('${data.categoryCount}', data.categoryCount)
                    .replace('${data.channelCount}', data.channelCount))
            });

            await interaction.reply({ embeds: [em] });
            return;
        } else {
            let em = new EmbedBuilder().setDescription(data.backup_all_of_your_backup).setColor("#bf0bb9").setTimestamp();
            let data2 = await client.db.get(`BACKUPS.${interaction.author.id}`);
            let b: number = 1;

            for (let i in data2) {
                let result = await client.db.get(`BACKUPS.${interaction.author.id}.${i}`);

                let v = (data.backup_string_see_another_v
                    .replace('${result.categoryCount}', result.categoryCount)
                    .replace('${result.channelCount}', result.channelCount));

                if (result) em.addFields({ name: `${result.guildName} - (||${i}||)`, value: v }) && b++;
            };

            await interaction.reply({ embeds: [em] });
            return;
        };
    },
};
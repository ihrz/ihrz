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
    Client,
    EmbedBuilder,
} from 'discord.js';

import * as db from '../../core/functions/DatabaseModel';

export = {
    run: async (client: Client, interaction: any, data: any) => {
        let backupID = interaction.options.getString('backup-id');

        if (backupID && !await db.DataBaseModel({id: db.Get, key: `BACKUPS.${interaction.user.id}.${backupID}`})) {
            return interaction.editReply({content: data.backup_this_is_not_your_backup});
        }
        ;

        if (backupID) {
            let data = await db.DataBaseModel({id: db.Get, key: `BACKUPS.${interaction.user.id}.${backupID}`});

            if (!data) return interaction.editReply({content: data.backup_backup_doesnt_exist});
            let v = (data.backup_string_see_v
                .replace('${data.categoryCount}', data.categoryCount)
                .replace('${data.channelCount}', data.channelCount));

            let em = new EmbedBuilder().setColor("#bf0bb9").setTimestamp().addFields({
                name: `${data.guildName} - (||${backupID}||)`,
                value: v
            });
            return interaction.editReply({content: ' ', embeds: [em]});
        } else {
            let em = new EmbedBuilder().setDescription(data.backup_all_of_your_backup).setColor("#bf0bb9").setTimestamp();
            let data2 = await db.DataBaseModel({id: db.Get, key: `BACKUPS.${interaction.user.id}`});
            let b: any = 1;
            for (let i in data2) {
                let result = await db.DataBaseModel({id: db.Get, key: `BACKUPS.${interaction.user.id}.${i}`});
                let v = (data.backup_string_see_another_v
                    .replace('${result.categoryCount}', result.categoryCount)
                    .replace('${result.channelCount}', result.channelCount));

                if (result) em.addFields({name: `${result.guildName} - (||${i}||)`, value: v}) && b++;
            }
            ;

            return interaction.editReply({content: ' ', embeds: [em]});
        }
        ;
    },
}
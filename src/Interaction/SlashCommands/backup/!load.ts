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
    Guild,
    PermissionsBitField,
} from 'pwss';

import backup from 'discord-rebackup';
import { BackupData } from 'discord-rebackup/lib/types';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let backupID = interaction.options.getString('backup-id');

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.backup_dont_have_perm_on_load });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.backup_i_dont_have_perm_on_load });
            return;
        };

        if (!backupID) {
            await interaction.editReply({ content: data.backup_unvalid_id_on_load });
            return;
        };

        if (backupID && !await client.db.get(`BACKUPS.${interaction.user.id}.${backupID}`)) {
            await interaction.editReply({
                content: data.backup_this_is_not_your_backup.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        await interaction.channel.send({
            content: data.backup_waiting_on_load.replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
        });

        backup.fetch(backupID).then(async () => {
            // @ts-ignore
            backup.load(backupID, interaction.guild).then(() => {
                backup.remove(backupID);
            }).catch((err) => {
                interaction.channel?.send({ content: data.backup_error_on_load.replace("${backupID}", backupID) });
                return;
            });
        }).catch((err) => {
            interaction.channel?.send({ content: client.iHorizon_Emojis.icon.No_Logo });
            return;
        });
    },
};
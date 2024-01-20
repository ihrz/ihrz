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
    Guild,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { BackupData } from 'discord-rebackup/lib/types';
import { Command } from '../../../../types/command';

import backup from 'discord-rebackup';

export const command: Command = {

    name: "backup-load",

    description: "Load your backup to initialize!",
    description_localizations: {
        "fr": "Charger une de vos backup(s)"
    },

    thinking: false,
    category: 'backup',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        let backupID = args[0];

        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.backup_dont_have_perm_on_load });
            return;
        };

        if (!interaction.guild?.members.me?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.backup_i_dont_have_perm_on_load });
            return;
        };

        if (!backupID) {
            await interaction.reply({ content: data.backup_unvalid_id_on_load });
            return;
        };

        if (backupID && !await client.db.get(`BACKUPS.${interaction.author.id}.${backupID}`)) {
            await interaction.reply({
                content: data.backup_this_is_not_your_backup.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        await interaction.channel?.send({
            content: data.backup_waiting_on_load.replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
        });

        backup.fetch(backupID).then(async () => {
            backup.load(backupID as string | BackupData, interaction.guild as Guild).then(() => {
                backup.remove(backupID as string);
            }).catch((err) => {
                interaction.channel?.send({ content: data.backup_error_on_load.replace("${backupID}", backupID as string) });
                return;
            });
        }).catch((err) => {
            interaction.channel?.send({ content: client.iHorizon_Emojis.icon.No_Logo });
            return;
        });
    },
};
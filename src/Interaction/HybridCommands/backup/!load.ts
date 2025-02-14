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
    ChatInputCommandInteraction,
    Client,
    Guild,
    Message,
    PermissionsBitField,
} from 'discord.js';

import backup from 'discord-rebackup';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { promptYesOrNo } from '../../../core/functions/awaitingResponse.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var backupID = interaction.options.getString('backup-id')!;
        } else {

            var backupID = client.method.string(args!, 0)!;
        };

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await client.method.interactionSend(interaction, { content: lang.backup_i_dont_have_perm_on_load });
            return;
        };

        if (!backupID) {
            await client.method.interactionSend(interaction, { content: lang.backup_unvalid_id_on_load });
            return;
        };

        if (backupID && !await client.db.get(`BACKUPS.${interaction.member.user.id}.${backupID}`)) {
            await client.method.interactionSend(interaction, {
                content: lang.backup_this_is_not_your_backup.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        let confirm = await promptYesOrNo(interaction, {
            content: lang.backup_load_confirm.replace("${interaction.member.user.toString()}", interaction.member.user.toString()),
            yesButton: lang.var_confirm,
            noButton: lang.embed_btn_cancel,
            dangerAction: true
        })

        if (!confirm) return await client.method.interactionSend(interaction, {
            content: lang.backup_not_load,
            components: []
        });

        await client.method.channelSend(interaction, {
            content: lang.backup_waiting_on_load.replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo),
            components: []
        });

        backup.fetch(backupID).then(async () => {
            // @ts-ignore
            backup.load(backupID, interaction.guild).then(() => false).catch((err) => {
                client.method.channelSend(interaction, { content: lang.backup_error_on_load.replace("${backupID}", backupID) });
                return;
            });
        }).catch((err) => {
            client.method.channelSend(interaction, { content: client.iHorizon_Emojis.icon.No_Logo });
            return;
        });
    },
};
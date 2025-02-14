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
    Client,
    PermissionsBitField,
    ChatInputCommandInteraction,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { axios } from '../../../core/functions/axios.js';

import { Command } from '../../../../types/command.js';

import { decrypt } from '../../../core/functions/encryptDecryptMethod.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;



        let backup = interaction.options.getAttachment("backup-to-load");

        if (backup) {
            try {
                const response = await fetch(backup.url);
                let res = JSON.parse(decrypt(client.config.api.apiToken, await response.text()) || "{}");
                if (!res) throw "";

                await client.db.set(`${interaction.guildId}`, res);
            } catch (error) {
                await interaction.editReply({ content: lang.guildconfig_config_restore_msg });
                return;
            }
        };

        await interaction.editReply({ content: lang.guildconfig_config_restore_msg });
        return
    },
};
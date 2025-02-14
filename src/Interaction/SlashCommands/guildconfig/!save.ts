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
    AttachmentBuilder,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import * as apiUrlParser from '../../../core/functions/apiUrlParser.js';
import { encrypt } from '../../../core/functions/encryptDecryptMethod.js';

import { SubCommand } from '../../../../types/command.js';
import { env } from '../../../version.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (env === 'production' || env === "dev") {
            await interaction.editReply({ content: lang.guildconfig_config_save_check_dm });
            let link = apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.ServerBackup);

            await interaction.user.send({ content: `${lang.guildconfig_config_save_user_msg_2}${link}/${interaction.guildId}/${encrypt(client.config.api.apiToken, Date.now().toString())}` })
                .catch(() => { })
                .then(() => { });
        } else {

            const dbGuild = await client.db.get(`${interaction.guildId}`);

            let buffer = Buffer.from(encrypt(client.config.api.apiToken, JSON.stringify(dbGuild)), 'utf-8');
            let attachment = new AttachmentBuilder(buffer, { name: interaction.guildId + '.json' })

            await interaction.editReply({ content: lang.guildconfig_config_save_check_dm });

            await interaction.user.send({
                content: lang.guildconfig_config_save_user_msg
                    .replace("${interaction.guild.name}", interaction.guild.name),
                files: [attachment]
            })
                .catch(() => { })
                .then(() => { });
        }
        return
    },
};
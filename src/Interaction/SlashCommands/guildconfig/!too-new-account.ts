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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';
import { SubCommandArgumentValue } from '../../../core/functions/method';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, data: LanguageData, command: SubCommandArgumentValue) => {        
        let permCheck = await client.method.permission.checkCommandPermission(interaction, command.command!);
        if (!permCheck.allowed) return client.method.permission.sendErrorMessage(interaction, data, permCheck.neededPerm || 0);

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let action = interaction.options.getString('action') as string;
        let maximumDate = interaction.options.getString('maximum-date');

        if ((!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) && permCheck.neededPerm === 0)) {
            await interaction.editReply({ content: data.setup_not_admin });
            return;
        }

        if (action === 'on') {
            if (!maximumDate) {
                await interaction.editReply({
                    content: data.too_new_account_dont_specified_time_on_enable
                });
                return;
            }

            let calculatedTime = client.timeCalculator.to_ms(maximumDate);
            if (!calculatedTime) {
                await interaction.editReply({
                    content: data.too_new_account_invalid_time_on_enable
                });
                return;
            }

            let beautifulTime = client.timeCalculator.to_beautiful_string(calculatedTime);

            await client.method.iHorizonLogs.send(interaction, {
                title: data.too_new_account_logEmbed_title,
                description: data.too_new_account_logEmbed_desc_on_enable
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${beautifulTime}', beautifulTime.toString())
                    .replace('${interaction.guild?.name}', beautifulTime.toString())
            });

            await client.db.set(`${interaction.guildId}.GUILD.BLOCK_NEW_ACCOUNT`, {
                state: true,
                req: calculatedTime
            });

            await interaction.editReply({
                content: data.too_new_account_logEmbed_desc_on_enable
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${beautifulTime}', beautifulTime.toString())
                    .replace('${interaction.guild?.name}', beautifulTime.toString())
            });
            return;

        } else if (action === 'off') {
            await client.method.iHorizonLogs.send(interaction, {
                title: data.too_new_account_logEmbed_title,
                description: data.too_new_account_logEmbed_desc_on_disable
                    .replace('${interaction.user}', interaction.user.toString())
            });

            await client.db.delete(`${interaction.guildId}.GUILD.BLOCK_NEW_ACCOUNT`);

            await interaction.editReply({
                content: data.too_new_account_command_work_on_disable
                    .replace('${interaction.user}', interaction.user.toString())
            });
            return;
        }
    },
};
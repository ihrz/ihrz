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
    Message,
    PermissionsBitField,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommandArgumentValue } from '../../../core/functions/method.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        const permissionsArray = [PermissionsBitField.Flags.ManageMessages]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.method.interactionSend(interaction, {
                content: data.clear_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var numberx = interaction.options.getNumber("number")!;
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var numberx = client.method.number(args!, 0);
        };

        if (numberx && numberx > 100) {
            await client.method.interactionSend(interaction, {
                content: data.clear_max_message_limit.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        (interaction.channel as BaseGuildTextChannel).bulkDelete(numberx as unknown as number, true)
            .then(async (messages) => {
                client.method.channelSend(interaction, {
                    content: data.clear_confirmation_message
                        .replace(/\${messages\.size}/g, messages.size.toString())
                });

                await client.method.iHorizonLogs.send(interaction, {
                    title: data.clear_logs_embed_title,
                    description: data.clear_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.member?.user.id!)
                        .replace(/\${messages\.size}/g, messages.size.toString())
                        .replace(/\${interaction\.channel\.id}/g, interaction.channel?.id!)
                });
            });
    },
};
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
} from 'pwss';


import logger from '../../../core/logger.js';
import backup from 'discord-rebackup';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/arg';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { content: data.backup_not_admin });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await client.args.interactionSend(interaction, { content: data.backup_i_dont_have_permission });
            return;
        };

        let i: number = 0;
        let j: number = 0;

        if (interaction instanceof ChatInputCommandInteraction) {
            var svMsg = interaction.options.getString('save-message')!;
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!); if (!_) return;
            var svMsg = client.args.string(args!, 0)!;
        };

        // @ts-ignore
        backup.create(interaction.guild, {
            maxMessagesPerChannel: svMsg === "yes" ? 10 : 0,
            jsonBeautify: true
        }).then(async (backupData) => {

            backupData.channels.categories.forEach(category => {
                i++;
                category.children.forEach(() => {
                    j++;
                });
            });

            let elData = { guildName: backupData.name, categoryCount: i, channelCount: j };

            await client.db.set(`BACKUPS.${interaction.member?.user.id}.${backupData.id}`, elData);

            interaction.channel?.send({ content: data.backup_command_work_on_creation });

            await client.args.interactionSend(interaction, {
                content: data.backup_command_work_info_on_creation
                    .replace("${backupData.id}", backupData.id)
            });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.backup_logs_embed_title_on_creation)
                    .setDescription(data.backup_logs_embed_description_on_creation
                        .replace('${interaction.user.id}', interaction.member?.user.id!)
                    );

                let logchannel = interaction.guild?.channels.cache.find((channel: {
                    name: string;
                }) => channel.name === 'ihorizon-logs');

                if (!logchannel) return;
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
            } catch (e: any) {
                logger.err(e)
            };
        });
    },
};
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

import logger from '../../../core/logger.js';
import backup from 'discord-backup';

export const command: Command = {

    name: "backup-create",

    description: "Create a backup!",
    description_localizations: {
        "fr": "Créer une backup"
    },

    thinking: false,
    category: 'backup',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.backup_not_admin });
            return;
        };

        if (!interaction.guild?.members.me?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.backup_i_dont_have_permission });
            return;
        };

        let i: number = 0;
        let j: number = 0;

        let svMsg = args[0];

        backup.create(interaction.guild, {
            maxMessagesPerChannel: svMsg ? 10 : 0,
            jsonBeautify: true
        }).then(async (backupData) => {

            await backupData.channels.categories.forEach(category => {
                i++;
                category.children.forEach(() => {
                    j++;
                });
            });

            let elData = { guildName: backupData.name, categoryCount: i, channelCount: j };

            await client.db.set(`BACKUPS.${interaction.author.id}.${backupData.id}`, elData);

            interaction.channel?.send({ content: data.backup_command_work_on_creation });

            await interaction.reply({
                content: data.backup_command_work_info_on_creation
                    .replace("${backupData.id}", backupData.id)
            });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.backup_logs_embed_title_on_creation)
                    .setDescription(data.backup_logs_embed_description_on_creation
                        .replace('${interaction.user.id}', interaction.author.id)
                    );

                let logchannel = interaction.guild?.channels.cache.find((channel: {
                    name: string;
                }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                };
            } catch (e: any) {
                logger.err(e)
            };
        });
    },
};
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
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';

import backup from 'discord-backup';
import ms from 'ms';

export const command: Command = {
    name: "backup",
    description: "Subcommand for backup category!",
    options: [
        {
            name: "create",
            description: "Create a backup!",
            type: 1,
        },
        {
            name: "load",
            description: "Load your backup to initialize!",
            type: 1,
            options: [
                {
                    name: 'backup-id',
                    type: ApplicationCommandOptionType.String,
                    description: 'Whats is the backup id?',
                    required: false
                },
            ],
        },
        {
            name: "list",
            description: "List your backup(s)!",
            type: 1,
        }
    ],
    category: 'backup',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        await interaction.reply({ content: data.backup_wait_please });

        if (command === 'create') {
            await require('./!sub_command/' + command).run(client, interaction, data);
        } else if (command === 'load') {
            await require('./!sub_command/' + command).run(client, interaction, data);
        } else if (command === 'list') {
            await require('./!sub_command/' + command).run(client, interaction, data);
        };
    },
}
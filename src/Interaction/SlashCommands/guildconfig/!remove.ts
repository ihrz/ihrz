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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    GuildChannel,
    EmbedBuilder,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;



        let channel = interaction.options.getChannel('channel') as GuildChannel;
        let all_channels: DatabaseStructure.GhostPingData['channels'] = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.GHOST_PING.channels`) || [];

        if (!all_channels?.includes(channel.id)) {
            await interaction.reply({
                content: lang.joinghostping_remove_isnt_set
                    .replace('${channel}', channel.toString())
            });
            return;
        };

        all_channels = all_channels.filter(x => x !== channel.id);

        await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.GHOST_PING.channels`, all_channels);

        let embed = new EmbedBuilder()
            .setTitle(lang.joinghostping_add_ok_embed_title)
            .setColor("#475387")
            .setDescription(lang.joinghostping_remove_ok_embed_desc)
            .addFields({
                name: lang.joinghostping_add_ok_embed_fields_name,
                value: all_channels.length > 0
                    ? Array.from(new Set(all_channels.map(x => `<#${x}>`))).join('\n')
                    : lang.var_no_set
            });

        await client.method.iHorizonLogs.send(interaction, {
            title: lang.joinghostping_add_logs_embed_title,
            description: lang.joinghostping_remove_logs_embed_desc
                .replace('${interaction.user}', interaction.user.toString())
                .replace('${channel}', channel.toString())
        });

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
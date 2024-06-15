/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

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
    PermissionsBitField
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let action = interaction.options.getString("time") as string;
        let time = client.timeCalculator.to_ms(action);

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.security_disable_not_admin });
            return;
        };

        if (!time) {
            await interaction.editReply({
                content: data.start_time_not_valid
                    .replace('${interaction.user}', interaction.user.toString())
            });
            return;
        };

        await client.db.set(`${interaction.guildId}.GUILD.CONFESSION.cooldown`, time);
        await interaction.reply({
            content: data.confession_coolodwn_command_work
                .replace('${interaction.user.toString()}', interaction.user.toString())
                .replace('${client.timeCalculator.to_beautiful_string(time)}', client.timeCalculator.to_beautiful_string(time))
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.confession_cooldown_log_embed_title)
                .setDescription(data.confession_cooldown_log_embed_desc
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${client.timeCalculator.to_beautiful_string(time)}', client.timeCalculator.to_beautiful_string(time))
                )

            let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) {
                (logchannel as BaseGuildTextChannel)?.send({ embeds: [logEmbed] })
            }
        } catch { };

        return;
    },
};
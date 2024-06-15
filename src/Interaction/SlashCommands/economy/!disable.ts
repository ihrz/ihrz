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
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has([PermissionsBitField.Flags.Administrator])) {
            await interaction.reply({ content: data.economy_disable_not_admin });
            return;
        };

        let state = interaction.options.getString("action") as string;
        let current_state = await client.db.get(`${interaction.guildId}.ECONOMY.disabled`);

        if (state === 'on') {

            if (!current_state) {
                await interaction.reply({
                    content: data.economy_disable_already_enable
                        .replace('${interaction.user.id}', interaction.user.id)
                });
                return;
            };

            await client.db.set(`${interaction.guildId}.ECONOMY.disabled`, false);

            await interaction.reply({
                content: data.economy_disable_set_enable
                    .replace('${interaction.user.id}', interaction.user.id)
            });
        } else if (state === 'off') {

            if (current_state) {
                await interaction.reply({
                    content: data.economy_disable_already_disable
                        .replace('${interaction.user.id}', interaction.user.id)
                });
                return;
            };

            await client.db.set(`${interaction.guildId}.ECONOMY.disabled`, true);

            await interaction.reply({
                content: data.economy_disable_set_disable
                    .replace('${interaction.user.id}', interaction.user.id)
            });
        };

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.economy_disable_logs_embed_title)
                .setDescription(data.economy_disable_logs_embed_desc
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace('${state}', state)
                );

            let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
        } catch (e) { return; };
    },
};
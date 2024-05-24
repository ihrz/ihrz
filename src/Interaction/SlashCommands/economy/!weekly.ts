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
    Client,
    EmbedBuilder,
    ChatInputCommandInteraction
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let timeout = 604800000;
        let amount = 1000;
        let weekly = await client.db.get(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.weekly`);

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await interaction.reply({
                content: data.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.user.id)
            });
            return;
        };

        if (weekly !== null && timeout - (Date.now() - weekly) > 0) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() - weekly));

            await interaction.reply({
                content: data.weekly_cooldown_error
                    .replace(/\${time}/g, time)
            })
        } else {
            let embed = new EmbedBuilder()
                .setAuthor({ name: data.weekly_embed_title, iconURL: interaction.user.displayAvatarURL() })
                .setColor("#a4cb80")
                .setDescription(data.weekly_embed_description)
                .addFields({ name: data.weekly_embed_fields, value: `${amount}${client.iHorizon_Emojis.icon.Coin}` })


            await client.db.add(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.money`, amount);
            await client.db.set(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.weekly`, Date.now());

            await interaction.reply({ embeds: [embed] });
            return;
        };
    },
};
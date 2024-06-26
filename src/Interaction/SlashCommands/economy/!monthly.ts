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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let timeout: number = 2592000000;
        let amount: number = 5000;

        let monthly = await client.db.get(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.monthly`);

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await interaction.reply({
                content: data.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.user.id)
            });
            return;
        };

        if (monthly !== null && timeout - (Date.now() - monthly) > 0) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() - monthly));

            await interaction.reply({ content: data.monthly_cooldown_error.replace(/\${time}/g, time) });
            return;
        } else {
            let embed = new EmbedBuilder()
                .setAuthor({ name: data.monthly_embed_title, iconURL: interaction.user.displayAvatarURL() })
                .setColor("#a4cb80")
                .setDescription(data.monthly_embed_description)
                .addFields({ name: data.monthly_embed_fields, value: `${amount}${client.iHorizon_Emojis.icon.Coin}` });
            await interaction.reply({ embeds: [embed] });
            await client.db.add(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.money`, amount);
            await client.db.set(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.monthly`, Date.now());
            return;
        };
    },
};
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
    User,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';

let talkedRecentlyforr = new Set();

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await interaction.reply({
                content: data.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.user.id)
            });
            return;
        };

        if (talkedRecentlyforr.has(interaction.user.id)) {
            await interaction.reply({ content: data.rob_cooldown_error });
            return;
        };

        let user = interaction.options.getUser("member") as User;
        let targetuser = await client.db.get(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`);
        let author = await client.db.get(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.money`);

        if (author < 250) {
            await interaction.reply({ content: data.rob_dont_enought_error });
            return;
        };

        if (targetuser < 250) {
            await interaction.reply({
                content: data.rob_him_dont_enought_error
                    .replace(/\${user\.user\.username}/g, user.globalName as string)
            });
            return;
        };

        let random = Math.floor(Math.random() * 200) + 1;

        let embed = new EmbedBuilder()
            .setDescription(data.rob_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                .replace(/\${user\.id}/g, user.id)
                .replace(/\${random}/g, random.toString())
            )
            .setColor("#a4cb80")
            .setTimestamp()

        await interaction.reply({ embeds: [embed] });

        await client.db.sub(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`, random);
        await client.db.add(`${interaction.guildId}.USER.${interaction.user.id}.ECONOMY.money`, random);

        talkedRecentlyforr.add(interaction.user.id);
        setTimeout(() => {
            talkedRecentlyforr.delete(interaction.user.id);
        }, 3000000);
    },
};
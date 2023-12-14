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
    EmbedBuilder,
} from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {
        let talkedRecentlyforw = new Set();

        if (talkedRecentlyforw.has(interaction.user.id)) {
            await interaction.reply({ content: data.work_cooldown_error });
            return;
        };

        let amount = Math.floor(Math.random() * 200) + 1;

        let embed = new EmbedBuilder()
            .setAuthor({
                name: data.work_embed_author
                    .replace(/\${interaction\.user\.username}/g, interaction.user.globalName),
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(data.work_embed_description
                .replace(/\${interaction\.user\.username}/g, interaction.user.globalName)
                .replace(/\${amount}/g, amount)
            )
            .setColor("#f1d488");

        await interaction.reply({ embeds: [embed] });
        await client.db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, amount);

        talkedRecentlyforw.add(interaction.user.id);
        setTimeout(() => {
            talkedRecentlyforw.delete(interaction.user.id);
        }, 3600000);
    },
};
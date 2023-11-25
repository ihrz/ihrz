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
    User
} from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let member: User = interaction.options.getUser('user') || interaction.user;
        var bal = await client.db.get(`${interaction.guild.id}.USER.${member.id}.ECONOMY.money`);

        if (!bal) {
            await client.db.set(`${interaction.guild.id}.USER.${member.id}.ECONOMY.money`, 1);
            await interaction.editReply({
                content: data.balance_he_dont_have_wallet
                    .replace('${user}', interaction.user)
            });
            return;
        };

        let totalWallet = (bal || 0) + (await client.db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.bank`) || 0);
        let embed = new EmbedBuilder()
            .setColor('#e3c6ff')
            .setTitle(`\`${member.username}\`'s Wallet`)
            .setThumbnail(member.displayAvatarURL())
            .setDescription(data.balance_he_have_wallet
                .replace(/\${bal}/g, totalWallet)
                .replace('${user}', member)
            )
            .addFields(
                { name: data.balance_embed_fields1_name, value: `${await client.db.get(`${interaction.guild.id}.USER.${member.id}.ECONOMY.bank`) || 0}🪙`, inline: true },
                { name: data.balance_embed_fields2_name, value: `${await client.db.get(`${interaction.guild.id}.USER.${member.id}.ECONOMY.money`) || 0}🪙`, inline: true }
            )
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp()

        await interaction.editReply({
            embeds: [embed]
        });
        return;
    },
};
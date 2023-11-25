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

import { Client, EmbedBuilder } from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {
        let toAnalyze = await client.db.get(`${interaction.guild.id}.USER`);

        // Convert the user data to an array for sorting
        let usersArray = Object.entries(toAnalyze);

        // Sort the users based on their total wealth
        usersArray.sort((a: any, b: any) => {
            let wealthA = (a[1]?.ECONOMY?.bank || 0) + (a[1]?.ECONOMY?.money || 0);
            let wealthB = (b[1]?.ECONOMY?.bank || 0) + (b[1]?.ECONOMY?.money || 0);
            return wealthB - wealthA;
        });

        let embed = new EmbedBuilder()
            .setColor('#e4b7ff')
            .setTitle(`Economy leaderboard of \`${interaction.guild.name}\``)
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp();

        usersArray = usersArray.slice(0, 10);

        // Display the sorted leaderboard
        usersArray.forEach((user: any, index) => {
            let userId = user[0];
            let userData = user[1]?.ECONOMY;

            if (userId !== 'undefined' && userData) {
                embed.addFields({
                    name: `#${index + 1}`,
                    value: `<@${userId}> - Bank: \`${userData.bank || 0}\`🪙 | Balance: \`${userData.money || 0}\`🪙`,
                    inline: false,
                });
            }
        });

        await interaction.editReply({ embeds: [embed] });
        return;
    },
};

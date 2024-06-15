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

import { ChatInputCommandInteraction, Client, EmbedBuilder } from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { DatabaseStructure } from '../../../core/database_structure';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        let toAnalyze = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await interaction.reply({
                content: data.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.user.id)
            });
            return;
        };

        // Convert the user data to an array for sorting
        let usersArray = Object.entries(toAnalyze);

        // Sort the users based on their total wealth
        usersArray.sort((a, b) => {
            let wealthA = (a[1]?.ECONOMY?.bank || 0) + (a[1]?.ECONOMY?.money || 0);
            let wealthB = (b[1]?.ECONOMY?.bank || 0) + (b[1]?.ECONOMY?.money || 0);
            return wealthB - wealthA;
        });

        let embed = new EmbedBuilder()
            .setColor('#e4b7ff')
            .setTitle(data.economy_leaderboard_embed_title
                .replace('${interaction.guild.name}', interaction.guild?.name as string)
            )
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setTimestamp();

        usersArray = usersArray.slice(0, 10);

        // Display the sorted leaderboard
        usersArray.forEach((user, index) => {
            let userId = user[0];
            let userData = user[1]?.ECONOMY;

            if (userId !== 'undefined' && userData) {
                embed.addFields({
                    name: `#${index + 1}`,
                    value: data.economy_leaderboard_embed_fields_value
                        .replaceAll('${client.iHorizon_Emojis.icon.Coin}', client.iHorizon_Emojis.icon.Coin)
                        .replace('${userId}', userId)
                        .replace('${userData.bank || 0}', String(userData?.bank || 0))
                        .replace('${userData.money || 0}', String(userData?.money || 0))
                    ,
                    inline: false,
                });
            }
        });

        await interaction.reply({
            embeds: [embed],
            files: [{ attachment: await client.functions.image64(client.user?.displayAvatarURL()), name: 'icon.png' }]
        });
        return;
    },
};

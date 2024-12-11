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

import { ChatInputCommandInteraction, Client, EmbedBuilder, Message } from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { DatabaseStructure } from '../../../../types/database_structure';
import { Command } from '../../../../types/command';
import { Option } from '../../../../types/option';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, command: Command, neededPerm: number, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.method.interactionSend(interaction,{
                content: lang.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        };

        let toAnalyze = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;

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
            .setTitle(lang.economy_leaderboard_embed_title
                .replace('${interaction.guild.name}', interaction.guild.name as string)
            )
            .setFooter(await client.method.bot.footerBuilder(interaction))
            .setTimestamp();

        usersArray = usersArray.slice(0, 10);

        // Display the sorted leaderboard
        usersArray.forEach((user, index) => {
            let userId = user[0];
            let userData = user[1].ECONOMY;

            if (userId !== 'undefined' && userData) {
                embed.addFields({
                    name: `#${index + 1}`,
                    value: lang.economy_leaderboard_embed_fields_value
                        .replaceAll('${client.iHorizon_Emojis.icon.Coin}', client.iHorizon_Emojis.icon.Coin)
                        .replace('${userId}', userId)
                        .replace('${userData.bank || 0}', String(userData.bank || 0))
                        .replace('${userData.money || 0}', String(userData.money || 0))
                    ,
                    inline: false,
                });
            }
        });

        await client.method.interactionSend(interaction,{
            embeds: [embed],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};

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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { DatabaseStructure } from '../../../core/database_structure';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        var text: string = data.leaderboard_default_text;
        let char = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;
        let tableau: Array<any> = [];
        let i: number = 1;

        for (let key in char) {
            let a = char?.[key]?.INVITES;

            if (a && a.invites && a.invites >= 1) {
                tableau.push({
                    invCount: a.invites,
                    text: data.leaderboard_text_inline
                        .replace(/\${i}/g, key)
                        .replace(/\${a\.invites\s*\|\|\s*0}/g, String(a.invites || 0))
                        .replace(/\${a\.regular\s*\|\|\s*0}/g, String(a.regular || 0))
                        .replace(/\${a\.bonus\s*\|\|\s*0}/g, String(a.bonus || 0))
                        .replace(/\${a\.leaves\s*\|\|\s*0}/g, String(a.leaves || 0))
                });
            }
        }

        tableau.sort((a: { invCount: number; }, b: { invCount: number; }) => b.invCount - a.invCount);

        tableau.forEach((index: { text: string; }) => {
            text += `Top #${i} - ${index.text}`;
            i++;
        });

        let embed = new EmbedBuilder()
            .setColor("#FFB6C1")
            .setDescription(text)
            .setTimestamp()
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setThumbnail(interaction.guild?.iconURL() as string);

        await interaction.editReply({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
        return;
    },
};
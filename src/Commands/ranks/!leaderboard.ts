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
    AttachmentBuilder,
} from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let char = await client.db.get(`${interaction.guild.id}.USER`);
        let tableau = [];

        for (let i in char) {
            var a = char?.[i]?.XP_LEVELING

            if (a) {
                let user = await interaction.client.users.cache.get(i);
                if (user) {
                    tableau.push({
                        text: `👤 <@${user.id}> \`(${user.globalName})\`\n⭐ ➥ **Level**: \`${a.level || '0'}\`\n🔱 ➥ **XP Total**: \`${a.xptotal}\``, length: a.xptotal,
                        rawText: `👤 (${user.globalName})\n⭐ ➥ Level: ${a.level || '0'}\n🔱 ➥ XP Total: ${a.xptotal}`
                    });
                };
            }
        };

        tableau.sort((a, b) => b.length - a.length);

        let embed = new EmbedBuilder().setColor("#1456b6").setTimestamp();
        let i = 1;
        let o = '';

        tableau.forEach(index => {
            if (i < 4) {
                embed.addFields({ name: `Top #${i}`, value: index.text });
            };
            o += `Top #${i} ${index.rawText}\n`
            i++;
        });

        let buffer = Buffer.from(o, 'utf-8');
        let attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.txt' })

        embed.setThumbnail(interaction.guild.iconURL({ dynamic: true }));
        embed.setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });
        embed.setTitle(`${interaction.guild.name}'s Levels Leaderboard`)
        await interaction.reply({ embeds: [embed], content: ' ', files: [attachment] });
        return;
    },
};
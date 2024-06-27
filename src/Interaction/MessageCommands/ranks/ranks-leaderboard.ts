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
    Client,
    EmbedBuilder,
    AttachmentBuilder,
    Message,
} from 'pwss';
import { DatabaseStructure } from '../../../core/database_structure';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {

    aliases: ['ranksleaderboard', 'leaderboardranks'],

    name: "ranksleaderboard",

    description: "Get the xp's leaderboard of the guild!",
    description_localizations: {
        "fr": "Obtenez le classement XP du serveur"
    },

    thinking: false,
    category: 'ranks',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, execTimestamp: number, args: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.author || !interaction.guild || !interaction.channel) return;

        const data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        let char = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;
        let array = [];

        for (let i in char) {
            var a = char[i].XP_LEVELING

            if (a) {
                let user = interaction.client.users.cache.get(i);

                if (user) {
                    array.push({
                        text: data.ranks_leaderboard_txt_text
                            .replace('${user}', user.toString())
                            .replace('${user.globalName}', user.globalName!)
                            .replace("${a.level || '0'}", String(a.level || '0'))
                            .replace('${a.xptotal}', a.xptotal?.toString()!),
                        length: a.xptotal,
                        rawText: data.ranks_leaderboard_txt_raw
                            .replace('${user.globalName}', user.globalName!)
                            .replace("${a.level || '0'}", String(a.level || '0'))
                            .replace('${a.xptotal}', a.xptotal?.toString()!)
                    });
                };
            }
        };

        array.sort((a, b) => b?.length! - a?.length!);

        let embed = new EmbedBuilder().setColor("#1456b6").setTimestamp();
        let i = 1;
        let o = '';

        array.forEach(index => {
            if (i < 4) {
                embed.addFields({ name: data.ranks_leaderboard_top_txt.replace('${i}', i.toString()), value: index.text });
            };
            o += data.ranks_leaderboard_top_txt_raw.replace('${i}', i.toString()).replace('${index.rawText}', index.rawText);
            i++;
        });

        let buffer = Buffer.from(o, 'utf-8');
        let attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.txt' })

        embed
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: await client.func.displayBotName(interaction.guild.id), iconURL: "attachment://icon.png" })
            .setTitle(data.ranks_leaderboard_embed_title.replace('${interaction.guild?.name}', interaction.guild.name));

        await interaction.reply({
            embeds: [embed],
            content: undefined,
            files: [attachment, { attachment: await interaction.client.func.image64(interaction.client.user.displayAvatarURL()), name: 'icon.png' }],
            allowedMentions: { repliedUser: false }
        });
        return;
    },
};
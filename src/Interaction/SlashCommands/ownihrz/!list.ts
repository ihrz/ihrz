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

import { OwnIHRZ } from '../../../core/modules/ownihrzManager.js';
import { format } from '../../../core/functions/date-and-time.js';

import { LanguageData } from '../../../../types/languageData';

const OWNIHRZ = new OwnIHRZ();

async function buildEmbed(client: Client, data: any, lang: LanguageData) {

    let bot_1 = (await OWNIHRZ.Get_Bot(data.Auth).catch(() => { }))?.data || 404;

    let utils_msg = lang.mybot_list_utils_msg
        .replace('${data_2[i].bot.id}', data.Bot.Id)
        .replace('${data_2[i].bot.username}', bot_1?.bot?.username || data?.Bot?.Name)
        .replace("${data_2[i].bot_public ? 'Yes' : 'No'}", bot_1?.bot_public !== undefined ? (bot_1?.bot_public ? lang.mybot_list_utils_msg_yes : lang.mybot_list_utils_msg_no) : (data?.Bot?.Public ? lang.mybot_list_utils_msg_yes : lang.mybot_list_utils_msg_no));

    let expire = format(new Date(data.ExpireIn), 'ddd, MMM DD YYYY');

    return new EmbedBuilder()
        .setColor('#ff7f50')
        .setThumbnail(`https://cdn.discordapp.com/avatars/${data.Bot.Id}/${bot_1?.bot?.avatar}.png`)
        .setTitle(lang.mybot_list_embed1_title.replace('${data_2[i].bot.username}', bot_1?.bot?.username || data?.Bot?.Name))
        .setDescription(
            lang.mybot_list_embed1_desc
                .replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
                .replace('${data_2[i].code}', data.Code)
                .replace('${expire}', expire)
                .replace('${utils_msg}', utils_msg)
        )
        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
        .setTimestamp();
};

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let table_1 = client.db.table("OWNIHRZ");
        let data_2 = await table_1.get(`MAIN.${interaction.user.id}`);
        let allData = await table_1.get("CLUSTER");

        let lsEmbed: EmbedBuilder[] = [
            new EmbedBuilder()
                .setTitle(data.mybot_list_embed0_title)
                .setColor('#000000')
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setTimestamp()
        ];

        for (let botId in data_2) {
            if (data_2[botId]) {
                let embed = await buildEmbed(client, data_2[botId], data);
                lsEmbed.push(embed);
            }
        }

        if (allData) {
            for (let botId in allData[interaction.user.id]) {
                let embed = await buildEmbed(client, allData[interaction.user.id][botId], data);
                lsEmbed.push(embed);
            }
        }

        await interaction.reply({
            embeds: lsEmbed,
            ephemeral: true,
            files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
        });
        return;
    },
};

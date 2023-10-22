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

import date from 'date-and-time';
import axios from 'axios';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let data_2 = await client.db.get(`OWNIHRZ.${interaction.user.id}`);

        let lsEmbed: Array<EmbedBuilder> = [];

        lsEmbed.push(
            new EmbedBuilder()
                .setTitle(data.mybot_list_embed0_title)
                .setColor('#000000')
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                .setTimestamp()
        );

        for (let i in data_2) {
            if (data_2[i]) {
                let config = {
                    headers: {
                        Authorization: `Bot ${data_2[i].auth}`
                    }
                };

                let bot_1 = (await axios.get(`https://discord.com/api/v10/applications/@me`, config)
                    .catch((e: any) => { }))?.data || 404;

                let utils_msg = data.mybot_list_utils_msg
                    .replace('${data_2[i].bot.id}', data_2[i].bot.id)
                    .replace('${data_2[i].bot.username}', data_2[i].bot.username)
                    .replace("${data_2[i].bot_public ? 'Yes' : 'No'}",
                        data_2[i].bot_public ? data.mybot_list_utils_msg_yes : data.mybot_list_utils_msg_no
                    );

                let expire = date.format(new Date(data_2[i].expireIn), 'ddd, MMM DD YYYY');

                let embed = new EmbedBuilder()
                    .setColor('#ff7f50')
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${data_2[i].bot.id}/${bot_1?.bot.avatar}.png`)
                    .setTitle(data.mybot_list_embed1_title
                        .replace('${data_2[i].bot.username}', data_2[i].bot.username)
                    )
                    .setDescription(
                        data.mybot_list_embed1_desc
                            .replace('${data_2[i].code}', data_2[i].code)
                            .replace('${expire}', expire)
                            .replace('${utils_msg}', utils_msg)
                    )
                    .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                    .setTimestamp()

                lsEmbed.push(embed);
            };
        }

        await interaction.deleteReply();
        await interaction.followUp({ embeds: lsEmbed, ephemeral: true });
        return;
    },
};
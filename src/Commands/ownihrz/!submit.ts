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

import axios from 'axios';
import ms from 'ms';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let discord_bot_token = interaction.options.getString('discord_bot_token');
        let owner_one = interaction.user;
        let owner_two = interaction.options.getUser('owner_two') || owner_one;

        let config = {
            headers: {
                Authorization: `Bot ${discord_bot_token}`
            }
        };

        let bot_1 = (await axios.get(`https://discord.com/api/v10/applications/@me`, config)
            .catch((e: any) => { }))?.data || 404;

        if (bot_1 === 404) {
            await interaction.deleteReply();
            await interaction.followUp({ content: data.mybot_submit_token_invalid });
            return;
        } else {
            var code = Math.random().toString(36).slice(-10);

            await client.db.set(`OWNIHRZ.TEMP.${interaction.user.id}.${code}`,
                {
                    auth: discord_bot_token,
                    owner_one: owner_one.id,
                    owner_two: owner_two.id,
                    expireIn: Date.now() + ms('30d'),
                    bot: {
                        id: bot_1.bot.id,
                        username: bot_1.bot.username,
                        public: bot_1.bot_public
                    }
                }
            );

            let utils_msg = data.mybot_submit_utils_msg
                .replace('${bot_1.bot.id}', bot_1.bot.id)
                .replace('${bot_1.bot.username}', bot_1.bot.username)
                .replace("${bot_1.bot_public ? 'Yes' : 'No'}",
                    bot_1.bot_public ? data.mybot_submit_utils_msg_yes : data.mybot_submit_utils_msg_no
                )

            let embed = new EmbedBuilder()
                .setColor('#ff7f50')
                .setTitle(data.mybot_submit_embed_title
                    .replace('${bot_1.bot.username}', bot_1.bot.username)
                    .replace('${bot_1.bot.discriminator}', bot_1.bot.discriminator)
                )
                .setDescription(
                    data.mybot_submit_embed_desc
                        .replace('${code}', code)
                        .replace('${utils_msg}', utils_msg)
                )
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

            await interaction.deleteReply();
            await interaction.followUp({ embeds: [embed], ephemeral: true });
            return;
        };
    },
};
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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js';

import axios from 'axios';
import ms from 'ms';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let discord_bot_token = interaction.options.getString('discord_bot_token');

        let config = {
            headers: {
                Authorization: `Bot ${discord_bot_token}`
            }
        };

        let bot_1 = (await axios.get(`https://discord.com/api/v10/applications/@me`, config)
            .catch(() => { }))?.data || 404;

        if (bot_1 === 404) {
            await interaction.reply({ content: data.mybot_submit_token_invalid });
            return;
        } else {
            var code = Math.random().toString(36).slice(-10);

            var table_1 = client.db.table("TEMP");
            await table_1.set(`OWNIHRZ.${interaction.user.id}.${code}`,
                {
                    Auth: discord_bot_token,
                    OwnerOne: interaction.user.id,
                    OwnerTwo: interaction.options.getUser('owner_two')?.id || interaction.user.id,
                    ExpireIn: Date.now() + ms('30d'),
                    Bot: {
                        Id: bot_1.bot.id,
                        Name: bot_1.bot.username,
                        Public: bot_1.bot_public
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

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        };
    },
};
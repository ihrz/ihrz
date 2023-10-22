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

import * as apiUrlParser from '../../core/functions/apiUrlParser';

import config from '../../files/config';
import CryptoJS, { enc } from 'crypto-js';
import axios from 'axios';
import logger from '../../core/logger';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let id_1 = interaction.options.getString('id');
        let id_2 = await client.db.get(`OWNIHRZ.TEMP`);

        for (let i in id_2) {
            for (let j in id_2[i]) {
                if (id_1 === j) {
                    id_2 = id_2?.[i]?.[j];
                }
            }
        };

        if ((interaction.user.id !== config.owner.ownerid1) && (interaction.user.id !== config.owner.ownerid2)) {
            await interaction.deleteReply();
            await interaction.followUp({ content: "❌", ephemeral: true });
            return;
        };

        if (!id_2) {
            await interaction.editReply({ content: data.mybot_manage_accept_not_found });
            return;
        };

        id_2.admin_key = config.api.apiToken;
        id_2.code = id_1;

        let config_2 = {
            headers: {
                Authorization: `Bot ${id_2.auth}`
            }
        };

        let bot_1 = (await axios.get(`https://discord.com/api/v10/applications/@me`, config_2)
            .catch((e: any) => { }))?.data || 404;

        if (bot_1 === 404) {
            await interaction.editReply({ content: data.mybot_manage_accept_token_error });
            return;
        } else {

            let utils_msg = data.mybot_manage_accept_utils_msg
                .replace('${bot_1.bot.id}', bot_1.bot.id)
                .replace('${bot_1.bot.username}', bot_1.bot.username)
                .replace("${bot_1.bot_public ? 'Yes' : 'No'}",
                    bot_1.bot_public ? data.mybot_manage_accept_utiis_yes : data.mybot_manage_accept_utils_no
                );

            let embed = new EmbedBuilder()
                .setColor('#ff7f50')
                .setTitle(data.mybot_manage_accept_embed_title
                    .replace('${bot_1.bot.username}', bot_1.bot.username)
                    .replace('${bot_1.bot.discriminator}', bot_1.bot.discriminator)
                )
                .setDescription(data.mybot_manage_accept_embed_desc
                    .replace('${utils_msg}', utils_msg)
                )
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

            await interaction.deleteReply();
            await interaction.followUp({ embeds: [embed], ephemeral: false });

            try {
                let encrypted = CryptoJS.AES.encrypt(JSON.stringify(id_2), config.api.apiToken).toString();

                axios.post(apiUrlParser.PublishURL, { cryptedJSON: encrypted }, { headers: { 'Accept': 'application/json' } })
                    .then((response: any) => { })
                    .catch(error => {
                        logger.err(error)
                    });
            } catch (error: any) {
                logger.err(error)
            };

            await client.db.delete(`OWNIHRZ.TEMP.${interaction.user.id}`);
            return;
        };
    },
};
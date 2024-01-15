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

import { ClusterMethod, OwnIhrzCluster, PublishURL } from '../../../core/functions/apiUrlParser';
import { LanguageData } from '../../../../types/languageData';

import config from '../../../files/config.js';
import axios, { AxiosResponse } from 'axios';
import logger from '../../../core/logger.js';
import path from 'path';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let cluster = interaction.options.getString("cluster");
        let id_1 = interaction.options.getString('id');

        var table_1 = client.db.table("TEMP");
        let id_2 = await table_1.get(`OWNIHRZ`);
        let URL = '';

        for (let i in id_2) {
            for (let j in id_2[i]) {
                if (id_1 === j) {
                    id_2 = id_2?.[i]?.[j];
                }
            }
        };

        if ((interaction.user.id !== config.owner.ownerid1) && (interaction.user.id !== config.owner.ownerid2)) {
            await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
            return;
        };

        if (!id_2) {
            await interaction.reply({ content: data.mybot_manage_accept_not_found });
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
            .catch(() => { }))?.data || 404;

        if (bot_1 === 404) {
            await interaction.reply({ content: data.mybot_manage_accept_token_error });
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

            await interaction.reply({ embeds: [embed], ephemeral: false });

            if (cluster) {
                URL = OwnIhrzCluster(cluster as unknown as number, ClusterMethod.CreateContainer)
            } else {
                URL = PublishURL;
            };

            try {
                axios.post(URL, id_2, { headers: { 'Accept': 'application/json' } })
                    .then(async (response: AxiosResponse) => {
                        if (cluster) {
                            var table_1 = client.db.table("CLUSTER");

                            await table_1.set(`CL${cluster}.${id_2.owner_one}.${id_2.code}`,
                                {
                                    path: (path.resolve(process.cwd(), 'ownihrz', id_2.code)) as string,
                                    port: 0,
                                    auth: id_2.auth,
                                    code: id_2.code,
                                    expireIn: id_2.expireIn,
                                    bot: id_2.bot
                                }
                            );
                        }
                    })
                    .catch(error => {
                        logger.err(error)
                    });
            } catch (error: any) {
                return logger.err(error)
            };

            var table_1 = client.db.table("TEMP");
            await table_1.delete(`OWNIHRZ.${interaction.user.id}`);
            return;
        };
    },
};
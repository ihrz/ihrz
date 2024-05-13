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
import { axios } from '../../../core/functions/axios.js';

import { LanguageData } from '../../../../types/languageData';
import { Custom_iHorizon } from '../../../../types/ownihrz';

import config from '../../../files/config.js';
import logger from '../../../core/logger.js';

async function activeIntent(token: string) {
    try {
        const response = await fetch("https://discord.com/api/v10/applications/@me", {
            method: "PATCH",
            headers: {
                Authorization: "Bot " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ flags: 565248 }),
        });
        return await response.json();

    } catch (err) {
        logger.err((err as unknown as string));
    }
};

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let cluster = parseInt(interaction.options.getString("cluster")!);
        let id = interaction.options.getString('id')!;

        var table = client.db.table("TEMP");
        let allData = await table.get(`OWNIHRZ`);

        function getData() {
            for (let ownerId in allData) {
                for (let botId in allData[ownerId]) {
                    if (botId !== id) continue;
                    return allData[ownerId][botId];
                }
            }
        }
        let id_2 = getData() as Custom_iHorizon;

        if (!id_2) {
            await interaction.reply({ content: data.mybot_manage_accept_not_found });
            return;
        };

        id_2.AdminKey = config.api?.apiToken!;
        id_2.Code = id;
        id_2.Lavalink = {
            NodeHost: config.lavalink.nodes[0].host,
            NodePort: config.lavalink.nodes[0].port,
            NodeAuth: config.lavalink.nodes[0].authorization,
        };

        await activeIntent(id_2.Auth).catch(() => { })

        if ((interaction.user.id !== config.owner.ownerid1) && (interaction.user.id !== config.owner.ownerid2)) {
            await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
            return;
        };

        let bot_1 = (await axios.get(`https://discord.com/api/v10/applications/@me`, {
            headers: {
                Authorization: `Bot ${id_2.Auth}`
            }
        }).catch(() => { }))?.data || 404;

        if (!bot_1.bot) {
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
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

            await interaction.reply({
                embeds: [embed],
                ephemeral: false,
                files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
            });

            try {
                new OwnIHRZ().Create_Container(cluster, id_2).then(async () => {
                    await table.delete(`OWNIHRZ.${interaction.user.id}.${id}`);
                })

            } catch (error: any) {
                return logger.err(error)
            };

            return;
        };
    },
};
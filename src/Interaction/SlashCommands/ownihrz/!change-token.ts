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

import { LanguageData } from '../../../../types/languageData';
import { Custom_iHorizon } from '../../../../types/ownihrz';

import logger from '../../../core/logger.js';

const OWNIHRZ = new OwnIHRZ();

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let botId = interaction.options.getString('botid')!;
        let newToken = interaction.options.getString('new_discord_bot_token')!;
        let tempTable = client.db.table('TEMP');
        let table = client.db.table('OWNIHRZ');

        let allData = await table.get("CLUSTER");

        let timeout: number = 3600000;
        let executingBefore = await tempTable.get(`OWNIHRZ_CHANGE_TOKEN.${interaction.user.id}.timeout`);

        if (executingBefore !== null && timeout - (Date.now() - executingBefore) > 0) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() - executingBefore));

            await interaction.reply({ content: data.monthly_cooldown_error.replace(/\${time}/g, time) });
            return;
        };

        function getData() {
            for (let ownerId in allData) {
                for (let bot_id in allData[ownerId]) {
                    if (bot_id !== botId) continue;
                    return allData[ownerId][botId];
                }
            }
        }

        let id_2 = getData() as Custom_iHorizon;

        if (!id_2) {
            await interaction.reply({ content: data.mybot_manage_accept_not_found });
            return;
        };

        if ((interaction.user.id !== client.config.owner.ownerid1) &&
            (interaction.user.id !== client.config.owner.ownerid2) &&
            (id_2.OwnerOne !== interaction.user.id)) {
            await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
            return;
        }

        let bot_1 = (await OWNIHRZ.Get_Bot(newToken).catch(() => { }))?.data || 404

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
                await OWNIHRZ.Change_Token(client.config, id_2.Cluster!, id_2.Code, newToken);

                await table.set(`OWNIHRZ.${interaction.user.id}.${botId}`, {
                    Auth: newToken
                });
            } catch (error: any) {
                return logger.err(error)
            };

            await tempTable.set(`OWNIHRZ_CHANGE_TOKEN.${interaction.user.id}.timeout`, Date.now());
            return;
        };
    },
};
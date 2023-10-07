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

import * as db from '../../core/functions/DatabaseModel';
import config from '../../files/config';

import axios from 'axios';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let id_1 = interaction.options.getString('id');

        let id_2 = await db.DataBaseModel({
            id: db.Get,
            key: `OWNIHRZ.TEMP.${interaction.user.id}.${id_1}`,
        });

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
            await interaction.editReply({ content: 'The bot in the DB cannot be found. We cannot proceed further.' });
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
            await interaction.editReply({ content: 'The token in the DB is invalid. We cannot proceed further.' });
            return;
        } else {

            let utils_msg =
                `__Bot ID__ \`${bot_1.bot.id}\`\n` +
                `__Bot username__ \`${bot_1.bot.username}\`\n` +
                `__Public Bot__ \`${bot_1.bot_public ? 'Yes' : 'No'}\``;

            let embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`Host your own iHorizon: ${bot_1.bot.username}#${bot_1.bot.discriminator}`)
                .setDescription(`The bot has been refused\n\n${utils_msg}`)
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

            await interaction.deleteReply();
            await interaction.followUp({ embeds: [embed], ephemeral: true });

            await db.DataBaseModel({
                id: db.Delete,
                key: `OWNIHRZ.TEMP.${interaction.user.id}`,
            });
        };
    },
};
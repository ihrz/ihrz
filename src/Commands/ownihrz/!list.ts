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
import date from 'date-and-time';
import axios from 'axios';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let data_2 = await db.DataBaseModel({
            id: db.Get,
            key: `OWNIHRZ.${interaction.user.id}`
        });

        let lsEmbed: Array<EmbedBuilder> = [];

        for (let i in data_2) {
            if (data_2[i]) {
                let config = {
                    headers: {
                        Authorization: `Bot ${data_2[i].auth}`
                    }
                };

                let bot_1 = (await axios.get(`https://discord.com/api/v10/applications/@me`, config)
                    .catch((e: any) => { }))?.data || 404;

                let utils_msg = `__Identifiant du bot__ \`${data_2[i].bot.id}\`
                        __Username du bot__ \`${data_2[i].bot.username}\`
                        __Bot Public__ \`${data_2[i].bot_public ? 'Oui' : 'Non'}\``

                let expire = date.format(new Date(data_2[i].expireIn), 'ddd, MMM DD YYYY');

                let embed = new EmbedBuilder()
                    .setColor('#ff7f50')
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${data_2[i].bot.id}/${bot_1.bot.avatar}.png`)
                    .setTitle(`Votre propre iHorizon : ${data_2[i].bot.username}`)
                    .setDescription(`Votre code de bot: ||**${data_2[i].code}**|| ⚠️ **Ne le partager à personne** !
                        **Expire dans**: \`${expire}\`
                        **Rejoignez le serveur support** [Cliquer Ici](https://discord.gg/ihorizon), si vous avez des problèmes avec votre bot.
                        ${utils_msg}`)
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
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
import * as apiUrlParser from '../../core/functions/apiUrlParser';
import * as db from '../../core/functions/DatabaseModel';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let slap = interaction.options.getUser("user");

        axios.get(apiUrlParser.SlapURL)
            .then(async (res: any) => {
                let embed = new EmbedBuilder()
                    .setColor(await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.fun-cmd` }) || "#42ff08")
                    .setDescription(data.slap_embed_description
                        .replace(/\${slap\.id}/g, slap.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )
                    .setImage(res.data)
                    .setTimestamp()
                await interaction.editReply({ embeds: [embed] });
                return;
            }).catch(async (err) => {
                await interaction.editReply({ content: 'Error: The API is down!' });
            });
    },
};
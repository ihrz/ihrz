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

export = {
    run: async (client: Client, interaction: any, data: any) => {
        let question = interaction.options.getString("question");

        let text = question.split(" ");

        if (!text[2]) {
            await interaction.editReply({ content: data.question_not_full });
            return;
        }

        let reponse = data.question_s
        let result = Math.floor((Math.random() * reponse.length));

        let embed = new EmbedBuilder()
            .setTitle(data.question_embed_title
                .replace(/\${interaction\.user\.username}/g, interaction.user.globalName)
            )
            .setColor(await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.fun-cmd`) || "#ddd98b")
            .addFields({ name: data.question_fields_input_embed, value: question, inline: true },
                { name: data.question_fields_output_embed, value: reponse[result] })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
    },
};
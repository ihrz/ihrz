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
        let member = interaction.options.getMember("member") || interaction.member;
        let baseData = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.user.id}.INVITES` });

        let inv = baseData?.invites;
        let leaves = baseData?.leaves;
        let Regular = baseData?.regular;
        let bonus = baseData?.bonus;

        let embed = new EmbedBuilder()
            .setColor("#92A8D1")
            .setTitle(data.invites_confirmation_embed_title)
            .setTimestamp()
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                data.invites_confirmation_embed_description
                    .replace(/\${member\.user\.id}/g, member.user.id)
                    .replace(/\${bonus\s*\|\|\s*0}/g, bonus || 0)
                    .replace(/\${leaves\s*\|\|\s*0}/g, leaves || 0)
                    .replace(/\${Regular\s*\|\|\s*0}/g, Regular || 0)
                    .replace(/\${inv\s*\|\|\s*0}/g, inv || 0)
            );

        await interaction.editReply({ embeds: [embed] });
        return;
    },
};
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

export = {
    run: async (client: Client, interaction: any, data: any) => {
        let mentionedUser = interaction.options.getUser("user") || interaction.user;

        let embed = new EmbedBuilder()
            .setImage(mentionedUser.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }))
            .setColor("#add5ff")
            .setTitle(data.avatar_embed_title
                .replace('${mentionedUser.username}', mentionedUser.username)
            )
            .setDescription(data.avatar_embed_description)
            .setTimestamp()
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
        return;
    },
};
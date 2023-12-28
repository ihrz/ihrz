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
import { LanguageData } from '../../../../types/languageData';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        var text = "";

        let baseData = await client.db.get(`${interaction.guild?.id}.ALLOWLIST`);

        if (!baseData) {

            await client.db.set(`${interaction.guild?.id}.ALLOWLIST`,
                {
                    enable: false,
                    list: {
                        [`${interaction.guild?.ownerId}`]: { allowed: true },
                    },
                }
            );

            baseData = await client.db.get(`${interaction.guild?.id}.ALLOWLIST`);
        };

        for (var i in baseData.list) {
            text += `<@${i}>\n`
        };

        if (interaction.user.id !== interaction.guild?.ownerId && !text.includes(interaction.user.id)) {
            await interaction.reply({ content: data.allowlist_show_not_permited });
            return;
        };

        let iconURL = client.user?.displayAvatarURL();

        let embed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: data.allowlist_show_embed_author })
            .setDescription(`${text}`)
            .setFooter({ text: 'iHorizon', iconURL: iconURL })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
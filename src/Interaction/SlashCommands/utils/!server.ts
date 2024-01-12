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
    PermissionsBitField
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let embed = new EmbedBuilder()
            .setColor('#c4afed')
            .setTitle(data.banner_guild_embed)
            .setImage(interaction.guild?.bannerURL({ extension: 'png', size: 4096 }) as string)
            .setThumbnail(interaction.guild?.iconURL({ size: 4096 }) as string)
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL({ size: 4096 }) })

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
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
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (interaction.user.id !== interaction.guild?.ownerId) {
            await interaction.editReply({ content: data.authorization_sanction_not_permited });
            return;
        };

        let choose = interaction.options.getString('choose');

        if (choose) {
            await client.db.set(`${interaction.guild.id}.PROTECTION.SANCTION`, choose);

            if (choose === 'simply') choose = data.authorization_sanction_simply;
            if (choose === 'simply+derank') choose = data.authorization_sanction_simply_unrank;
            if (choose === 'simply+ban') choose = data.authorization_sanction_simply_ban;

            await interaction.editReply({
                content: data.authorization_sanction_command_work
                    .replace('${interaction.user}', interaction.user .toString())
                    .replace('${choose}', choose)
            });
            return;
        };
    },
};
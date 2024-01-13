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
    ChatInputCommandInteraction
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        let user = interaction.options.getUser("member");
        let amount = interaction.options.getNumber("amount");

        let member = await client.db.get(`${interaction.guild?.id}.USER.${user?.id}.ECONOMY.money`);
        if (amount?.toString().includes('-')) {
            await interaction.reply({ content: data.pay_negative_number_error });
            return;
        };

        if (amount && member < amount) {
            await interaction.reply({ content: data.pay_dont_have_enought_to_give });
            return;
        }

        await interaction.reply({
            content: data.pay_command_work
                .replace(/\${interaction\.user\.username}/g, interaction.user.globalName as string)
                .replace(/\${user\.user\.username}/g, user?.globalName as string)
                .replace(/\${amount}/g, amount as unknown as string)
        });

        await client.db.add(`${interaction.guild?.id}.USER.${user?.id}.ECONOMY.money`, amount!);
        await client.db.sub(`${interaction.guild?.id}.USER.${interaction.user.id}.ECONOMY.money`, amount!);
        return;
    },
};
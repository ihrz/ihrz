/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/
import { ChatInputCommandInteraction } from 'discord.js';
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel)
            return;
        if (interaction instanceof ChatInputCommandInteraction) {
            var amount = interaction.options.getNumber("amount");
            var user = interaction.options.getMember("member");
        }
        else {
            var amount = client.method.number(args, 0);
            var user = client.method.member(interaction, args, 0);
        }
        ;
        let member = await client.db.get(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`);
        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.method.interactionSend(interaction, {
                content: lang.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        }
        ;
        if (amount.toString().includes('-')) {
            await client.method.interactionSend(interaction, { content: lang.pay_negative_number_error });
            return;
        }
        ;
        if (amount && member < amount) {
            await client.method.interactionSend(interaction, { content: lang.pay_dont_have_enought_to_give });
            return;
        }
        await client.method.interactionSend(interaction, {
            content: lang.pay_command_work
                .replace(/\${interaction\.user\.username}/g, interaction.member.user.globalName || interaction.member.user.username)
                .replace(/\${user\.user\.username}/g, user.user.globalName)
                .replace(/\${amount}/g, amount.toString())
        });
        await client.db.add(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`, amount);
        await client.db.sub(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`, amount);
        return;
    },
};

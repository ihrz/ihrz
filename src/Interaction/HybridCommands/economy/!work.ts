/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

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
    Message,
    User,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        let permCheck = await client.method.permission.checkCommandPermission(interaction, command.command!);
        if (!permCheck.allowed) return client.method.permission.sendErrorMessage(interaction, data, permCheck.neededPerm || 0);

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        let timeout = 3_600_000;
        let work = await client.db.get(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.work`);

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.method.interactionSend(interaction,{
                content: data.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        };

        if (work !== null && timeout - (Date.now() - work) > 0) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() - work));

            await client.method.interactionSend(interaction,{
                content: data.work_cooldown_error
                    .replace('${interaction.user.id}', interaction.member.user.id)
                    .replace('${time}', time),
                ephemeral: true
            });
            return;
        };

        let amount = Math.floor(Math.random() * 1024) + 1;

        let embed = new EmbedBuilder()
            .setAuthor({
                name: data.work_embed_author
                    .replace(/\${interaction\.user\.username}/g, (interaction.member.user as User).globalName || interaction.member.user.username),
                iconURL: (interaction.member.user as User).displayAvatarURL()
            })
            .setDescription(data.work_embed_description
                .replace(/\${interaction\.user\.username}/g, (interaction.member.user as User).globalName || interaction.member.user.username)
                .replace(/\${amount}/g, amount.toString())
            )
            .setColor("#f1d488");

        await client.method.interactionSend(interaction,{ embeds: [embed] });

        await client.db.add(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`, amount);
        await client.db.set(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.work`, Date.now());
    },
};
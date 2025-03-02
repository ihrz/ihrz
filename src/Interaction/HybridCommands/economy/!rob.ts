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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.func.method.interactionSend(interaction, {
                content: lang.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        };

        let timeout = (await client.db.get(`${interaction.guildId}.ECONOMY.settings.rob.cooldown`) || 3000000);
        let rob = await client.db.get(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.rob`);

        if (interaction instanceof ChatInputCommandInteraction) {
            var user = interaction.options.getMember("member") as GuildMember;
        } else {
            var user = client.func.method.member(interaction, args!, 0) as GuildMember;
        };

        if (rob !== null && timeout - (Date.now() - rob) > 0) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() - rob), lang);

            await client.func.method.interactionSend(interaction, {
                content: lang.work_cooldown_error
                    .replace('${interaction.user.id}', interaction.member.user.id)
                    .replace('${time}', time),
                ephemeral: true
            });
            return;
        };

        let targetuser = await client.db.get(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`);
        let author = await client.db.get(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`);

        if (author < 250) {
            await client.func.method.interactionSend(interaction, { content: lang.rob_dont_enought_error });
            return;
        };

        if (targetuser < 250) {
            await client.func.method.interactionSend(interaction, {
                content: lang.rob_him_dont_enought_error
                    .replace(/\${user\.user\.username}/g, user.user.globalName as string)
            });
            return;
        };

        let random = Math.floor(Math.random() * 200) + 1;

        let embed = new EmbedBuilder()
            .setDescription(lang.rob_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
                .replace(/\${user\.id}/g, user.id)
                .replace(/\${random}/g, random.toString())
            )
            .setColor("#a4cb80")
            .setTimestamp()

        await client.func.method.interactionSend(interaction, { embeds: [embed] });

        await client.db.sub(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`, random);
        await client.db.add(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`, random);
        await client.db.set(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.rob`, Date.now());
    },
};
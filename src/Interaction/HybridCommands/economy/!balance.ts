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
    User
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';
import { Option } from '../../../../types/option';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, command: Command, neededPerm: number, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.method.interactionSend(interaction, {
                content: lang.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var member: GuildMember = interaction.options.getMember('user') as GuildMember || interaction.member;
        } else {
            
            var member: GuildMember = client.method.member(interaction, args!, 0) || interaction.member;
        };

        var bal = await client.db.get(`${interaction.guildId}.USER.${member.id}.ECONOMY.money`);

        if (!bal) {
            await client.db.set(`${interaction.guildId}.USER.${member.id}.ECONOMY.money`, 1);
            await client.method.interactionSend(interaction, {
                content: lang.balance_he_dont_have_wallet
                    .replace("${client.iHorizon_Emojis.icon.Wallet_Logo}", client.iHorizon_Emojis.icon.Wallet_Logo)
                    .replace('${user}', member.toString())
            });
            return;
        };

        let totalWallet = (bal || 0) + (await client.db.get(`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.bank`) || 0);

        let embed = new EmbedBuilder()
            .setColor('#e3c6ff')
            .setTitle(`\`${member.user.username}\`'s Wallet`)
            .setThumbnail(member.displayAvatarURL())
            .setDescription(lang.balance_he_have_wallet
                .replace(/\${bal}/g, totalWallet)
                .replace('${user}', member.toString())
                .replace("${client.iHorizon_Emojis.icon.Wallet_Logo}", client.iHorizon_Emojis.icon.Wallet_Logo)
            )
            .addFields(
                { name: lang.balance_embed_fields1_name, value: `${await client.db.get(`${interaction.guildId}.USER.${member.id}.ECONOMY.bank`) || 0}${client.iHorizon_Emojis.icon.Coin}`, inline: true },
                { name: lang.balance_embed_fields2_name, value: `${await client.db.get(`${interaction.guildId}.USER.${member.id}.ECONOMY.money`) || 0}${client.iHorizon_Emojis.icon.Coin}`, inline: true }
            )
            .setFooter(await client.method.bot.footerBuilder(interaction))
            .setTimestamp()

        await client.method.interactionSend(interaction, {
            embeds: [embed],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};
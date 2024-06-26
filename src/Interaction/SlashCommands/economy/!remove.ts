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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    User,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.removemoney_not_admin });
            return;
        };

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await interaction.reply({
                content: data.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.user.id)
            });
            return;
        };

        var amount = interaction.options.getNumber("amount") as number;
        let user = interaction.options.getUser("member") as User;

        await client.db.sub(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`, amount!);
        let bal = await client.db.get(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`);

        let embed = new EmbedBuilder()
            .setAuthor({ name: data.removemoney_embed_title, iconURL: interaction.user.displayAvatarURL() })
            .addFields({ name: data.removemoney_embed_fields, value: `${amount}$` },
                { name: data.removemoney_embed_second_fields, value: `${bal}$` })
            .setColor("#bc0116")
            .setTimestamp()

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.removemoney_logs_embed_title)
                .setDescription(data.removemoney_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace(/\${amount}/g, amount.toString())
                    .replace(/\${user\.user\.id}/g, user.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
        } catch (e) { return; };

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
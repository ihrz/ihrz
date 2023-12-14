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
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let balance = await client.db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`);
        let toDeposit = interaction.options.getNumber('how-much');

        if (toDeposit > balance) {
            await interaction.reply({ content: data.deposit_cannot_abuse });
            return;
        };

        await client.db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.bank`, toDeposit);
        await client.db.sub(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, toDeposit);

        let embed = new EmbedBuilder()
            .setAuthor({ name: data.daily_embed_title, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setColor("#a4cb80")
            .setTitle(data.deposit_embed_title)
            .setDescription(data.deposit_embed_desc
                .replace('${interaction.user}', interaction.user)
                .replace('${toDeposit}', toDeposit)
            )
            .addFields({ name: data.deposit_embed_fields1_name, value: `${await client.db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.bank`)}🪙` })
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
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
    ChatInputCommandInteraction,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let balance = await client.db.get(`${interaction.guild?.id}.USER.${interaction.user.id}.ECONOMY.money`);
        let toDeposit = interaction.options.getNumber('how-much');

        if (toDeposit && toDeposit > balance) {
            await interaction.reply({
                content: data.deposit_cannot_abuse.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        await client.db.add(`${interaction.guild?.id}.USER.${interaction.user.id}.ECONOMY.bank`, toDeposit!);
        await client.db.sub(`${interaction.guild?.id}.USER.${interaction.user.id}.ECONOMY.money`, toDeposit!);

        let embed = new EmbedBuilder()
            .setAuthor({ name: data.daily_embed_title, iconURL: interaction.user.displayAvatarURL() })
            .setColor("#a4cb80")
            .setTitle(data.deposit_embed_title)
            .setDescription(data.deposit_embed_desc
                .replace('${client.iHorizon_Emojis.icon.Coin}', client.iHorizon_Emojis.icon.Coin)
                .replace('${interaction.user}', interaction.user as unknown as string)
                .replace('${toDeposit}', toDeposit as unknown as string)
            )
            .addFields({ name: data.deposit_embed_fields1_name, value: `${await client.db.get(`${interaction.guild?.id}.USER.${interaction.user.id}.ECONOMY.bank`)}${client.iHorizon_Emojis.icon.Coin}` })
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
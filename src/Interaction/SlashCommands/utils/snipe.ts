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
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'pwss'

import { Command } from '../../../../types/command';

export const command: Command = {
    name: 'snipe',

    description: 'Get the last message deleted in this channel!',
    description_localizations: {
        "fr": "Obtenez le dernier message supprimé sur ce cannal"
    },

    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId);

        var based = await client.db.get(`${interaction.guildId}.GUILD.SNIPE.${interaction.channel.id}`);

        if (!based) {
            await interaction.reply({ content: data.snipe_no_previous_message_deleted });
            return;
        };

        let embed = new EmbedBuilder()
            .setColor("#474749")
            .setAuthor({ name: based.snipeUserInfoTag, iconURL: based.snipeUserInfoPp })
            .setDescription(`\`\`\`${based.snipe}\`\`\``)
            .setTimestamp(based.snipeTimestamp);

        await interaction.reply({ embeds: [embed] });
        return;
    },
};
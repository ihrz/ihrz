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
    Client,
    EmbedBuilder,
    ChatInputCommandInteraction,
    ApplicationCommandType
} from 'pwss'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'botinfo',

    description: 'Get information about the bot!',
    description_localizations: {
        "fr": "Obtenir les informations supplémentaire par rapport au bot."
    },

    category: 'bot',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let usersize = client.guilds.cache.reduce((a, b) => a + b.memberCount, 0);

        let clientembed = new EmbedBuilder()
            .setColor("#f0d020")
            .setThumbnail("attachment://icon.png")
            .addFields(
                { name: data.botinfo_embed_fields_myname, value: `:green_circle: ${client.user.username}`, inline: false },
                { name: data.botinfo_embed_fields_mychannels, value: `:green_circle: ${client.channels.cache.size}`, inline: false },
                { name: data.botinfo_embed_fields_myservers, value: `:green_circle: ${client.guilds.cache.size}`, inline: false },
                { name: data.botinfo_embed_fields_members, value: `:green_circle: ${usersize}`, inline: false },
                { name: data.botinfo_embed_fields_libraires, value: `:green_circle: pwss@${client.version.djs}`, inline: false },
                { name: data.botinfo_embed_fields_created_at, value: ":green_circle: <t:1600042320:R>", inline: false },
                { name: data.botinfo_embed_fields_created_by, value: ":green_circle: <@171356978310938624>", inline: false },
            )
            .setTimestamp()
            .setFooter({ text: `iHorizon ${client.version.ClientVersion}`, iconURL: "attachment://icon.png" })
            .setTimestamp()

        await interaction.reply({ embeds: [clientembed], files: [{ attachment: await client.func.image64(client.user.displayAvatarURL()), name: 'icon.png' }] });
        return;
    },
};
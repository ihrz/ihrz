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
    PermissionsBitField,
    TextChannel
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let channel = interaction.options.getChannel('to');
        let fetch = await client.db.get(`${interaction.guildId}.PFPS.disable`);

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({
                content: data.pfps_channel_not_admin
            });
            return;
        };

        if (!fetch && (channel instanceof TextChannel)) {
            await client.db.set(`${interaction.guildId}.PFPS.channel`, channel.id);

            let embed = new EmbedBuilder()
                .setColor('#333333')
                .setTitle(data.pfps_channel_embed_title)
                .setDescription(data.pfps_channel_embed_desc
                    .replace('${interaction.user}', interaction.user.toString())
                )
                .setTimestamp();

            await interaction.reply({
                content: data.pfps_channel_command_work
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${channel}', channel.toString())
            });

            channel.send({ embeds: [embed] });
            return;

        } else {
            await interaction.reply({
                content: data.pfps_channel_command_error
                    .replace('${interaction.user}', interaction.user.toString())
            });
            return;
        };
    },
};
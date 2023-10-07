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
    EmbedBuilder,
    PermissionsBitField
} from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let channel = interaction.options.getChannel("channel");

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setsuggest_channel_not_admin });
            return;
        };

        let fetchOldChannel = await client.db.get(`${interaction.guild.id}.SUGGEST.channel`);

        if (fetchOldChannel === channel.id) {
            await interaction.editReply({
                content: data.setsuggest_channel_already_set_with_that
                    .replace('${interaction.user}', interaction.user)
                    .replace('${channel}', channel)
            });
            return;
        };

        let setupEmbed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle(data.setsuggest_channel_embed_title)
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setDescription(data.setsuggest_channel_embed_desc);

        await client.db.set(`${interaction.guild.id}.SUGGEST.channel`, channel.id);
        await interaction.editReply({
            content: data.setsuggest_channel_command_work
                .replace('${interaction.user}', interaction.user)
                .replace('${channel}', channel)
        });

        channel.send({ embeds: [setupEmbed] });
        return;
    },
};
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
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'prevnames',
    description: 'Lookup an Discord User, and see this previous username !',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'user you want to lookup',
            required: false
        }
    ],
    category: 'utils',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let user = interaction.options.getUser("user") || interaction.user;

        // if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        //     await interaction.editReply({ content: data.prevnames_not_admin });
        //     return;
        // };

        let fetch = await client.db.get(`DB.PREVNAMES.${user.id}`);
        if (fetch) fetch = fetch.join('\n');

        let prevEmbed = new EmbedBuilder().setColor("#000000");
        prevEmbed.setTitle(data.prevnames_embed_title.replace("${user.username}", user.globalName));
        prevEmbed.setDescription(fetch || data.prevnames_undetected);
        prevEmbed.setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

        await interaction.editReply({ embeds: [prevEmbed] });
        return;
    },
};
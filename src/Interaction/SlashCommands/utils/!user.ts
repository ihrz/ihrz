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
    User
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';
import { axios } from '../../../core/functions/axios.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let user: User | undefined = interaction.options.getUser('user') || interaction.user;
        let format = 'png';

        let config = {
            headers: {
                Authorization: `Bot ${client.token}`
            }
        };

        let user_1 = (await axios.get(`https://discord.com/api/v8/users/${user?.id}`, config))?.data;
        let banner = user_1?.['banner'];

        if (banner !== null && banner?.substring(0, 2) === 'a_') {
            format = 'gif'
        };

        let embed = new EmbedBuilder()
            .setColor('#c4afed')
            .setTitle(data.banner_user_embed.replace('${user?.username}', user?.username))
            .setImage(`https://cdn.discordapp.com/banners/${user_1?.id}/${banner}.${format}?size=1024`)
            .setThumbnail((user?.displayAvatarURL() as string))
            .setFooter({
                text: await client.func.displayBotName(interaction.guild.id), iconURL: "attachment://icon.png"
            });

        await interaction.reply({
            embeds: [embed],
            files: [{ attachment: await interaction.client.func.image64(interaction.client.user.displayAvatarURL()), name: 'icon.png' }]
        });
        return;
    },
};
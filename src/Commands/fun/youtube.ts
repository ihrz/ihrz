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

/*
・ ElektraBots Discord Bot (https://github.com/belugafr/ElektraBots)

・ Mainly developed by NayaWeb (https://github.com/belugafr)

・ Copyright © 2021-2023 ElektraBots
*/

import {
    ApplicationCommandOptionType,
    AttachmentBuilder,
    Client,
    EmbedBuilder,
    User,
} from 'discord.js'

import { Command } from '../../../types/command';
import axios from 'axios';

export const command: Command = {
    name: 'youtube',
    description: 'Permit to send custom youtube comment (real) !',
    category: 'bot',
    options: [
        {
            name: 'user',
            description: "The user",
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'comment',
            description: "The comment",
            required: true,
            type: ApplicationCommandOptionType.String
        },
    ],
    run: async (client: Client, interaction: any) => {

        let args = interaction.options.getString('comment');
        args = args.split(' ');

        let user: User = interaction.options.getUser('user') || interaction.user;

        if (args.length < 1) {
            await interaction.editReply({ content: 'Please, send a good sentence!' });
            return;
        };

        let avatarURL = user.avatarURL({ extension: 'png' });
        let username = user.globalName;

        let link = `https://some-random-api.com/canvas/misc/youtube-comment?avatar=${encodeURIComponent((avatarURL as string))}&username=${encodeURIComponent((username as string))}&comment=${encodeURIComponent(args.join(' '))}`;

        let embed = new EmbedBuilder()
            .setColor('#000000')
            .setImage('attachment://all-human-have-rights-elektra.png')
            .setTimestamp()
            .setFooter({ text: 'iHorizon x ElektraBots' });

        let imgs;

        await axios.get(link, { responseType: 'arraybuffer' }).then((response: any) => {
            imgs = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'youtube-elektra.png' });
            embed.setImage(`attachment://youtube-elektra.png`);
        });

        await interaction.editReply({ embeds: [embed], files: [imgs] });
        return;
    },
};
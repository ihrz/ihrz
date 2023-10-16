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

import { Client, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import logger from '../../core/logger';
import config from '../../files/config';

export = {
    run: async (client: Client, interaction: any, data: any) => {
        var user1 = interaction.options.getUser("user1") || interaction.user;
        var user2 = interaction.options.getUser("user2") || interaction.guild.members.cache.random().user;

        let profileImageSize = 512;
        let canvasWidth = profileImageSize * 3;
        let canvasHeight = profileImageSize;

        let canvas = createCanvas(canvasWidth, canvasHeight);
        let ctx = canvas.getContext('2d');

        let heartEmojiPath = `${process.cwd()}/src/assets/heart.png`;

        let profileImage1URL = user1.displayAvatarURL({ extension: 'png', size: 512 });
        let profileImage2URL = user2.displayAvatarURL({ extension: 'png', size: 512 });

        try {
            const [profileImage1, profileImage2, heartEmoji] = await Promise.all([
                loadImage(profileImage1URL),
                loadImage(profileImage2URL),
                loadImage(heartEmojiPath)
            ]);

            ctx.drawImage(profileImage1, 0, 0, profileImageSize, canvasHeight);

            let heartX = profileImageSize;
            let heartY = profileImageSize / 2 - heartEmoji.height / 2;

            ctx.drawImage(heartEmoji, heartX, heartY);
            ctx.drawImage(profileImage2, profileImageSize * 1 + heartEmoji.width, 0, profileImageSize, canvasHeight);

            // Convertir le canvas en buffer
            let buffer = canvas.toBuffer('image/png');

            let always100: Array<string> = config.command.alway100;

            var found = always100.find(element => {
                if (
                    element === `${user1.id}x${user2.id}`
                    ||
                    element === `${user2.id}x${user1.id}`
                ) {
                    return true;
                }
                return false;
            });

            var randomNumber: Number;
            if (found) {
                randomNumber = 100;
            } else {
                randomNumber = Math.floor(Math.random() * 101);
            };

            var embed = new EmbedBuilder()
                .setColor("#FFC0CB")
                .setTitle("💕")
                .setImage(`attachment://love.png`)
                .setDescription(data.love_embed_description
                    .replace('${user1.username}', user1.username)
                    .replace('${user2.username}', user2.username)
                    .replace('${randomNumber}', randomNumber)
                )
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                .setTimestamp();

            let file = new AttachmentBuilder(buffer, { name: 'love.png' });

            await interaction.editReply({ embeds: [embed], files: [file] });
        } catch (error: any) {
            logger.err(error);
            await interaction.editReply({ content: data.love_command_error });
        }
    },
};
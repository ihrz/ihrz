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
    AttachmentBuilder,
} from 'discord.js';

import config from '../../files/config';

import axios from 'axios';
import fs from 'fs';
import {createCanvas, loadImage} from "canvas";

let downloadImage = (url: string, filename: string) => {
    return new Promise((resolve, reject) => {
        axios.get(url, {responseType: 'stream'})
            .then(response => {
                let writer = fs.createWriteStream(filename);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            })
            .catch(error => {
                reject(error);
            });
    });
};

export = {
    run: async (client: Client, interaction: any, data: any) => {
        var user1 = interaction.options.getUser("user1");
        var user2 = interaction.options.getUser("user2");

        if (!user1) user1 = interaction.user;
        if (!user2) user2 = interaction.guild.members.cache.random().user;

        let profileImageSize = 512;
        let canvasWidth = profileImageSize * 3;
        let canvasHeight = profileImageSize;

        let canvas = createCanvas(canvasWidth, canvasHeight);
        let ctx = canvas.getContext('2d');

        let heartEmojiPath = `${process.cwd()}/src/assets/heart.png`;

        let profileImage1URL = `https://cdn.discordapp.com/avatars/${user1.id}/${user1.avatar}.png`;
        let profileImage2URL = `https://cdn.discordapp.com/avatars/${user2.id}/${user2.avatar}.png`;

        await Promise.all([
            downloadImage(profileImage1URL, `${process.cwd()}/src/temp/profileImage1_${user1.id}.png`),
            downloadImage(profileImage2URL, `${process.cwd()}/src/temp/profileImage2_${user2.id}.png`)
        ]);

        let downloadAndLoadImages = async () => {
            let [profileImage1, profileImage2, heartEmoji] = await Promise.all([
                loadImage(`${process.cwd()}/src/temp/profileImage1_${user1.id}.png`),
                loadImage(`${process.cwd()}/src/temp/profileImage2_${user2.id}.png`),
                loadImage(heartEmojiPath)
            ]);

            ctx.drawImage(profileImage1, 0, 0, profileImageSize, canvasHeight);

            let heartX = profileImageSize;
            let heartY = profileImageSize / 2 - heartEmoji.height / 2;

            ctx.drawImage(heartEmoji, heartX, heartY);
            ctx.drawImage(profileImage2, profileImageSize * 1 + heartEmoji.width, 0, profileImageSize, canvasHeight);

            let outputFilePath = `${process.cwd()}/src/temp/${user1.id}x${user2.id}.png`;
            let outputStream = fs.createWriteStream(outputFilePath);
            let stream = canvas.createPNGStream();

            return new Promise((resolve, reject) => {
                stream.pipe(outputStream);
                outputStream.on('finish', () => {

                    fs.unlinkSync(`${process.cwd()}/src/temp/profileImage1_${user1.id}.png`);
                    fs.unlinkSync(`${process.cwd()}/src/temp/profileImage2_${user2.id}.png`);

                    resolve(outputFilePath);
                });
                outputStream.on('error', reject);
            });
        };

        try {
            let imagePath: any = await downloadAndLoadImages();
            let file = new AttachmentBuilder(imagePath);

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
            }
            ;

            var embed = new EmbedBuilder()
                .setColor("#FFC0CB")
                .setTitle("💕")
                .setImage(`attachment://${user1.id}x${user2.id}.png`)
                .setDescription(data.love_embed_description
                    .replace('${user1.username}', user1.username)
                    .replace('${user2.username}', user2.username)
                    .replace('${randomNumber}', randomNumber)
                )
                .setFooter({text: 'iHorizon', iconURL: client.user?.displayAvatarURL()})
                .setTimestamp();

            return interaction.editReply({embeds: [embed], files: [file]});
        } catch (error: any) {
            console.log(error)
            return interaction.editReply({content: data.love_command_error});
        }
        ;

    },
}
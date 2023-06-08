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

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const request = require('request');

const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    request.head(url, (err, res, body) => {
      request(url)
        .pipe(fs.createWriteStream(filename))
        .on('finish', resolve)
        .on('error', reject);
    });
  });
};

slashInfo.fun.love.run = async (client, interaction) => {
  const random = interaction.options.getBoolean("random");

  if (random) {
    var user1 = interaction.guild.members.cache.random().user;
    var user2 = interaction.guild.members.cache.random().user;
  } else {
    var user1 = interaction.options.getUser("user1");
    var user2 = interaction.options.getUser("user2");

    if(!user1 || !user2) { return interaction.reply({ content: "Please provide two users !", ephemeral: true }); };
  }
  const profileImageSize = 512;
  const canvasWidth = profileImageSize * 3;
  const canvasHeight = profileImageSize;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  const heartEmojiPath = `${process.cwd()}/files/ihorizon-api/src/imgs/heart.png`;

  const profileImage1URL = `https://cdn.discordapp.com/avatars/${user1.id}/${user1.avatar}.png`;
  const profileImage2URL = `https://cdn.discordapp.com/avatars/${user2.id}/${user2.avatar}.png`;

  await Promise.all([
    downloadImage(profileImage1URL, `${process.cwd()}/files/temp/profileImage1_${user1.id}.png`),
    downloadImage(profileImage2URL, `${process.cwd()}/files/temp/profileImage2_${user2.id}.png`)
  ]);

  const downloadAndLoadImages = async () => {
    const [profileImage1, profileImage2, heartEmoji] = await Promise.all([
      loadImage(`${process.cwd()}/files/temp/profileImage1_${user1.id}.png`),
      loadImage(`${process.cwd()}/files/temp/profileImage2_${user2.id}.png`),
      loadImage(heartEmojiPath)
    ]);

    ctx.drawImage(profileImage1, 0, 0, profileImageSize, canvasHeight);

    const heartX = profileImageSize;
    const heartY = profileImageSize / 2 - heartEmoji.height / 2;

    ctx.drawImage(heartEmoji, heartX, heartY);
    ctx.drawImage(profileImage2, profileImageSize * 1 + heartEmoji.width, 0, profileImageSize, canvasHeight);

    const outputFilePath = `${process.cwd()}/files/temp/${user1.id}x${user2.id}.png`;
    const outputStream = fs.createWriteStream(outputFilePath);
    const stream = canvas.createPNGStream();

    return new Promise((resolve, reject) => {
      stream.pipe(outputStream);
      outputStream.on('finish', () => {

        fs.unlinkSync(`${process.cwd()}/files/temp/profileImage1_${user1.id}.png`);
        fs.unlinkSync(`${process.cwd()}/files/temp/profileImage2_${user2.id}.png`);

        resolve(outputFilePath);
      });
      outputStream.on('error', reject);
    });
  };

  try {
    const imagePath = await downloadAndLoadImages();
    const file = new AttachmentBuilder(imagePath);

    let always100 = ['171356978310938624x1099042785736282205'];

    const found = always100.find(element => {
      if (
        element === `${user1.id}x${user2.id}`
        ||
        element === `${user2.id}x${user1.id}`
      ) {
        return true;
      }
      return false;
    });

    if (found) { randomNumber = 100; } else { randomNumber = Math.floor(Math.random() * 101); };

    const e = new EmbedBuilder()
      .setColor("#FFC0CB")
      .setTitle("💕 ✨ 🥰 ✨ 💕")
      .setImage(`attachment://${user1.id}x${user2.id}.png`)
      .setDescription(`**${user1.username}** + **${user2.username}** = __${randomNumber}%__ of love 💗`)
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) })
      .setTimestamp();

    return interaction.reply({ embeds: [e], files: [file] });
  } catch (error) {
    return interaction.reply({ content: "Une erreur est survenue lors de l'exécution du commande" });
  }
};

module.exports = slashInfo.fun.love;
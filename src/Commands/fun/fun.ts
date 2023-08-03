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
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
    AttachmentBuilder,
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import { createCanvas, loadImage } from 'canvas';

import axios from 'axios';
import ms from 'ms';
import fs from 'fs';

const downloadImage = (url: string, filename: string) => {
    return new Promise((resolve, reject) => {
        axios.get(url, { responseType: 'stream' })
            .then(response => {
                const writer = fs.createWriteStream(filename);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            })
            .catch(error => {
                reject(error);
            });
    });
};

export const command: Command = {
    name: "fun",
    description: "Subcommand for fun category!",
    options: [
        {
            name: 'caracteres',
            description: 'Transform a string into a DarkSasuke!',
            type: 1,
            options: [
                {
                    name: 'nickname',
                    type: ApplicationCommandOptionType.String,
                    description: 'your cool nickname to transform !',
                    required: true
                }
            ],
        },
        {
            name: 'cats',
            description: 'Get a picture of cat!',
            type: 1,
        },
        {
            name: 'dogs',
            description: 'Get a picture of dog!',
            type: 1,
        },
        {
            name: 'hack',
            description: 'Hack a user!',
            type: 1,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to hack",
                    required: true
                }
            ],
        },
        {
            name: 'hug',
            description: 'Hug a user!',
            type: 1,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to hug",
                    required: true
                }
            ],
        },
        {
            name: 'kiss',
            description: 'Kiss a user!',
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to kiss',
                    required: true
                }
            ],
        },
        {
            name: 'love',
            description: 'Show your love compatibilty with the user!',
            type: 1,
            options: [
                {
                    name: "user1",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to know you love's compatibilty",
                    required: false
                },
                {
                    name: "user2",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to know you love's compatibilty",
                    required: false
                }
            ],
        },
        {
            name: 'morse',
            description: 'Transform a string into a Morse!',
            type: 1,
            options: [
                {
                    name: 'input',
                    type: ApplicationCommandOptionType.String,
                    description: 'Enter your input to encrypt/decrypt in morse',
                    required: true
                }
            ],
        },
        {
            name: 'poll',
            description: 'Create a poll!',
            type: 1,
            options: [
                {
                    name: 'message',
                    type: ApplicationCommandOptionType.String,
                    description: 'The message showed on the poll',
                    required: true
                }
            ],
        },
        {
            name: 'question',
            description: 'Ask a question to the bot !',
            type: 1,
            options: [
                {
                    name: 'question',
                    type: ApplicationCommandOptionType.String,
                    description: 'The question you want to give for the bot',
                    required: true
                }
            ],
        },
        {
            name: 'slap',
            description: 'Slap a user!',
            type: 1,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.User,
                    description: "The user you want to slap",
                    required: true
                }
            ],
        }
    ],
    category: 'fun',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'caracteres') {

            let w = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
                "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
                "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
            let r = ["𝕒", "𝕓", "𝕔", "𝕕", "𝕖", "𝕗", "𝕘", "𝕙", "𝕚", "𝕛", "𝕜", "𝕝", "𝕞", "𝕟", "𝕠", "𝕡", "𝕢", "𝕣", "𝕤", "𝕥", "𝕦", "𝕧", "𝕨", "𝕩", "𝕪", "𝕫",
                "𝔸", "𝔹", "ℂ", "𝔻", "𝔼", "𝔽", "𝔾", "ℍ", "𝕀", "𝕁", "𝕂", "𝕃", "𝕄", "ℕ", "𝕆", "ℙ", "ℚ", "ℝ", "𝕊", "𝕋", "𝕌", "𝕍", "𝕎", "𝕏", "𝕐", "ℤ",
                "𝟘", "𝟙", "𝟚", "𝟛", "𝟜", "𝟝", "𝟞", "𝟟", "𝟠", "𝟡"]
            let nw = interaction.options.getString("nickname");

            let n = [];
            for (let x = 0; x < nw.length; x++) {
                for (let i = 0; i < w.length; i++) {
                    if (nw[x] !== nw[x].replace(w[i], r[i])) {
                        n.push(nw[x].replace(w[i], r[i]));
                    }
                }
            };

            return interaction.reply({ content: n.join("") });

        } else if (command === 'cats') {

            axios.get('http://edgecats.net/random').then(res => {
                const emb = new EmbedBuilder()
                    .setImage(res.data)
                    .setTitle(data.cats_embed_title)
                    .setTimestamp();

                return interaction.reply({ embeds: [emb] });
            });

        } else if (command === 'dogs') {

            axios.get('https://dog.ceo/api/breeds/image/random')
                .then(res => {
                    const emb = new EmbedBuilder()
                        .setImage(res.data.message).setTitle(data.dogs_embed_title).setTimestamp();

                    return interaction.reply({ embeds: [emb] });
                })
                .catch(err => {
                    logger.err(err); return interaction.reply({ content: data.dogs_embed_command_error });
                });

        } else if (command === 'hack') {

            const victim = interaction.options.getUser("user")
            var ip = [
                '1', '100', '168', '254', '345', '128', '256', '255', '0', '144',
                '38', '67', '97', '32', '64', '192', '10', '172', '12', '200', '87',
                '150', '42', '99', '76', '211', '172', '18', '86', '55', '220', '7'
            ];

            var hackerNames = [
                'cyberpunk', 'zeroday', 'blackhat', 'hackmaster', 'shadowbyte', 'crypt0',
                'phishr', 'darknet', 'rootaccess', 'sploit3r', 'hack3rman', 'v1rus',
                'bytebandit', 'malware', 'scriptkiddie'
            ];

            var hackerDomains = [
                'hackmail.com', 'darkweb.net', 'blackhat.org', 'zerodaymail.com',
                'phishmail.net', 'cryptomail.org', 'sploitmail.com', 'hackergang.com',
                'rootmail.org', 'v1rusmail.com'
            ];

            var hackerPasswords = [
                '5up3rP@$$w0rd', 'H4x0r!z3d',
                'N0s3cur1ty', '3vilG3nius', '0bscureC0de', 'Hacker123!', 'P@$$phr4s3',
                'D3c3pt10n', '0v3rwr1t3', 'V1rtu4lInf1ltr4t0r', 'R3v3rse3ng1n33r',
                'C0mpl3xM4tr1x', 'D1g1t4lS3cr3t', 'Myst3ryH4ck', 'Ph4nt0mC0ntrol'
            ];

            function generateRandomNumber() {
                var text = "";
                var possible = "0123456789";
                for (var i = 0; i < 8; i++)
                    text += possible.charAt(Math.floor(Math.random() * possible.length));
                return text;
            };

            var generatedIp = `${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}`;
            var generatedUsername = `${hackerNames[Math.floor(Math.random() * hackerNames.length)]}${generateRandomNumber()}`;
            var generatedEmail = `${generatedUsername}@${hackerDomains[Math.floor(Math.random() * hackerDomains.length)]}`;
            var generatedPassword = hackerPasswords[Math.floor(Math.random() * hackerPasswords.length)];

            const embed = new EmbedBuilder()
                .setColor("#800000")
                .setDescription(data.hack_embed_description
                    .replace(/\${victim\.id}/g, victim.id)
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )
                .addFields({ name: data.hack_embed_fields_ip, value: `\`${generatedIp}\`` },
                    { name: data.hack_embed_fields_email, value: `\`${generatedEmail}\`` },
                    { name: data.hack_embed_fields_password, value: `\`${generatedPassword}\`` })
                .setTimestamp()

            return interaction.reply({ embeds: [embed] });

        } else if (command === 'hug') {

            let hug = interaction.options.getUser("user");

            var hugGif = [
                'https://cdn.discordapp.com/attachments/975288553787494450/1053838033373368350/hug.gif',
                'https://cdn.discordapp.com/attachments/975288553787494450/1053838033675366461/hug2.gif',
                'https://cdn.discordapp.com/attachments/975288553787494450/1053838033994129448/hug3.jpg',
                "https://cdn.discordapp.com/attachments/975288553787494450/1053838034191257650/hug4.jpg",
                "https://cdn.discordapp.com/attachments/975288553787494450/1053838034375815339/hug5.jpg"
            ];

            let embed = new EmbedBuilder()
                .setColor("#FFB6C1")
                .setDescription(data.hug_embed_title
                    .replace(/\${hug\.id}/g, hug.id)
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )
                .setImage(hugGif[Math.floor(Math.random() * hugGif.length)])
                .setTimestamp()
            return interaction.reply({ embeds: [embed] });

        } else if (command === 'kiss') {

            let kiss = interaction.options.getUser("user");

            var kissGif = [
                'https://cdn.discordapp.com/attachments/600751265781252149/613486150002278630/tenor-4.gif',
                'https://cdn.discordapp.com/attachments/600751265781252149/613486548561952788/tenor-5.gif',
                'https://cdn.discordapp.com/attachments/717813904046293063/717818490601603072/kiss1.gif',
                'https://cdn.discordapp.com/attachments/717813904046293063/717818780910223410/kiss2.gif'

            ];

            let embed = new EmbedBuilder()
                .setColor("#ff0884")
                .setDescription(data.kiss_embed_description
                    .replace(/\${kiss\.id}/g, kiss.id)
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )
                .setImage(kissGif[Math.floor(Math.random() * kissGif.length)])
                .setTimestamp()

            return interaction.reply({ embeds: [embed] });

        } else if (command === 'love') {

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

            const downloadAndLoadImages = async () => {
                const [profileImage1, profileImage2, heartEmoji] = await Promise.all([
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
                if (found) { randomNumber = 100; } else { randomNumber = Math.floor(Math.random() * 101); };

                var embed = new EmbedBuilder()
                    .setColor("#FFC0CB")
                    .setTitle("💕")
                    .setImage(`attachment://${user1.id}x${user2.id}.png`)
                    .setDescription(data.love_embed_description
                        .replace('${user1.username}', user1.username)
                        .replace('${user2.username}', user2.username)
                        .replace('${randomNumber}', randomNumber)
                    )
                    .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], files: [file] });
            } catch (error: any) {
                console.log(error)
                return interaction.reply({ content: data.love_command_error });
            };

        } else if (command === 'morse') {

            let i: number;

            let data = await client.functions.getLanguageData(interaction.guild.id);

            let alpha = " ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split(""),
                morse = "/,.-,-...,-.-.,-..,.,..-.,--.,....,..,.---,-.-,.-..,--,-.,---,.--.,--.-,.-.,...,-,..-,...-,.--,-..-,-.--,--..,.----,..---,...--,....-,.....,-....,--...,---..,----.,-----".split(","),
                text = interaction.options.getString("input").toUpperCase();
            while (text.includes("Ä") || text.includes("Ö") || text.includes("Ü")) {
                text = text.replace("Ä", "AE").replace("Ö", "OE").replace("Ü", "UE");
            }
            if (text.startsWith(".") || text.startsWith("-")) {
                text = text.split(" ");
                let length = text.length;
                for (i = 0; i < length; i++) {
                    text[i] = alpha[morse.indexOf(text[i])];
                }
                text = text.join("");
            } else {
                text = text.split("");
                let length = text.length;
                for (i = 0; i < length; i++) {
                    text[i] = morse[alpha.indexOf(text[i])];
                }
                text = text.join(" ");
            }
            return interaction.reply({ content: "```" + text + "```" });

        } else if (command === 'poll') {

            let pollMessage = interaction.options.getString("message");

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.poll_not_admin });
            };

            let pollEmbed = new EmbedBuilder()
                .setTitle(data.poll_embed_title
                    .replace(/\${interaction\.user\.username}/g, interaction.user.username)
                )
                .setColor("#ddd98b")
                .setDescription(pollMessage)
                .addFields({ name: data.poll_embed_fields_reaction, value: data.poll_embed_fields_choice })
                .setImage("https://cdn.discordapp.com/attachments/610152915063013376/610947097969164310/loading-animation.gif")
                .setTimestamp()

            let msg = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });

            await msg.react('✅');
            await msg.react('❌');

        } else if (command === 'question') {

            let question = interaction.options.getString("question");

            let text = question.split(" ");

            if (!text[2]) return interaction.reply({ content: data.question_not_full });

            let reponse = data.question_s
            let result = Math.floor((Math.random() * reponse.length));

            let embed = new EmbedBuilder()
                .setTitle(data.question_embed_title
                    .replace(/\${interaction\.user\.username}/g, interaction.user.username)
                )
                .setColor("#ddd98b")
                .addFields({ name: data.question_fields_input_embed, value: question, inline: true },
                    { name: data.question_fields_output_embed, value: reponse[result] })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] })

        } else if (command === 'slap') {

            var slapGif = [
                'https://cdn.discordapp.com/attachments/717813924203855882/717982041899139152/slap1.gif',
                'https://cdn.discordapp.com/attachments/717813924203855882/717982255661711381/slap2.gif',
                'https://cdn.discordapp.com/attachments/717813924203855882/717982464299106314/slap3.gif'

            ];
            let slap = interaction.options.getUser("user");

            let embed = new EmbedBuilder()
                .setColor("#42ff08")
                .setDescription(data.slap_embed_description
                    .replace(/\${slap\.id}/g, slap.id)
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )
                .setImage(slapGif[Math.floor(Math.random() * slapGif.length)])
                .setTimestamp()
            return interaction.reply({ embeds: [embed] });

        };
    },
}
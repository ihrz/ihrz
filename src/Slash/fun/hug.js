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

const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

slashInfo.fun.hug.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    const hug = interaction.options.getUser("user");

    var hugGif = [
        'https://cdn.discordapp.com/attachments/975288553787494450/1053838033373368350/hug.gif',
        'https://cdn.discordapp.com/attachments/975288553787494450/1053838033675366461/hug2.gif',
        'https://cdn.discordapp.com/attachments/975288553787494450/1053838033994129448/hug3.jpg',
        "https://cdn.discordapp.com/attachments/975288553787494450/1053838034191257650/hug4.jpg",
        "https://cdn.discordapp.com/attachments/975288553787494450/1053838034375815339/hug5.jpg"
    ];

    const embed = new EmbedBuilder()
        .setColor("#FFB6C1")
        .setDescription(data.hug_embed_title
            .replace(/\${hug\.id}/g, hug.id)
            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
        )
        .setImage(hugGif[Math.floor(Math.random() * hugGif.length)])
        .setTimestamp()
    return interaction.reply({ embeds: [embed] });

};

module.exports = slashInfo.fun.hug;
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
} = require(`${process.cwd()}/files/ihorizonjs`);

const logger = require(`${process.cwd()}/src/core/logger`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

slashInfo.ranks.xpleaderboard.run = async (client, interaction) => {
    const ownerList = await DataBaseModel({ id: DataBaseModel.All });
    const foundArray = ownerList.findIndex(d => d.id === interaction.guild.id);

    await interaction.reply({ content: ":clock:" });
    if(!ownerList[foundArray]) return interaction.editReply({ content: 'Not data found in the storage.' });
    const char = ownerList[foundArray].value.USER;
    let tableau = [];

    for (const i in char) {
        const a = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.USER.${i}.XP_LEVELING` });
        if (a) {
            let user = await interaction.client.users.cache.get(i);
            tableau.push({ text: `👤 \`${user.username}\`\n⭐ ➥ **Level**: \`${a.level}\`\n:diamond_shape_with_a_dot_inside: ➥ **XP Total**: \`${a.xptotal}\``, length: a.xptotal })
        }
    };

    tableau.sort((a, b) => b.length - a.length);

    const embed = new EmbedBuilder().setColor("#1456b6").setTimestamp();
    let i=1;
    tableau.forEach(index => {
        embed.addFields({name: `Top #${i}`, value: index.text});
        i++;
    });

    embed.setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`);
    embed.setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) });
    embed.setTitle(`${interaction.guild.name}'s Levels Leaderboard`)
    return await interaction.editReply({ embeds: [embed], content: ' ' });
};

module.exports = slashInfo.ranks.xpleaderboard;
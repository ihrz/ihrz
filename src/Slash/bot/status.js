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

var os = require('os-utils');
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

slashInfo.bot.status.run = async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);

    const config = require(`${process.cwd()}/files/config.js`);
    if (interaction.user.id != config.owner.ownerid1 || interaction.user.id != config.owner.ownerid2) {
        return interaction.reply({ content: data.status_be_bot_dev })
    };

    os.cpuUsage(function (c) {

        const embed = new EmbedBuilder()
            .setColor("#42ff08")
            .addFields(
                { name: "=====================", value: '**Consumed in real time** :', inline: false },
                { name: "**CPU USAGE:**", value: 'CPU Usage (%): **' + c + '** %', inline: false },
                { name: "**RAM USAGE:**", value: 'MEMORY Usage (%): **' + os.freememPercentage() + '** %', inline: false },
                { name: "=====================", value: '**Characteristic of the server** :', inline: false },
                { name: "**TOTAL RAM:**", value: 'TOTAL RAM (MB): **' + os.totalmem() + '** MB', inline: false },
                { name: "**CPU NAME:**", value: '**AMD RYZEN 7 5700G 8 CORE / 12 THREADS 4.6Ghz**', inline: false },
                { name: "=====================", value: '`iHORIZON`', inline: false }
            )
            .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })

        return interaction.reply({ embeds: [embed] });
    })
};

module.exports = slashInfo.bot.status;
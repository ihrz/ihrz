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

const ping = require("ping");
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

slashInfo.bot.ping.run = async (client, interaction) => {
  let data = await getLanguageData(interaction.guild.id);

  await interaction.reply(':ping_pong:')

  let network = ''
  network = await ping.promise.probe("192.168.0.254").then(result => network = result.time).catch(e => { network = "**DOWN**" });

  let API = ''
  API = await ping.promise.probe("discord.com").then(result => API = result.time).catch(e => { API = "**DOWN**" });

  let embed = new EmbedBuilder()
    .setColor("#319938")
    .setTitle("Pong! 🏓")
    .setDescription(`**Network** : \`${await network}\` ms\n**Discord API** : \`${await API}\` ms`)

  interaction.editReply({ content: '', embeds: [embed] })
};

module.exports = slashInfo.bot.ping;
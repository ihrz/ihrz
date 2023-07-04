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
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

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

slashInfo.utils.snipe.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  var based = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.SNIPE.${interaction.channel.id}` });

  if (!based) { return interaction.reply({ content: data.snipe_no_previous_message_deleted }) };

  let embed = new EmbedBuilder()
    .setColor("#474749")
    .setAuthor({ name: based.snipeUserInfoTag, iconURL: based.snipeUserInfoPp })
    .setDescription(`\`${based.snipe || 0}\``)
    .setTimestamp(based.snipeTimestamp);

  return interaction.reply({ embeds: [embed] })
};

module.exports = slashInfo.utils.snipe;
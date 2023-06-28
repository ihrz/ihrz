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
  ChannelType,
  EmbedBuilder,
  Permissions,
  ApplicationCommandType,
  PermissionsBitField,
  ApplicationCommandOptionType
} = require(`${process.cwd()}/files/ihorizonjs`);

const ms = require("ms");
const config = require(`${process.cwd()}/files/config.js`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.newfeatures.report.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  var sentences = interaction.options.getString("message-to-dev")
  let timeout = 18000000
  let cooldown = await DataBaseModel({id: DataBaseModel.Get, key:`${interaction.guild.id}.USER.${interaction.user.id}.REPORT.cooldown`});

  if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
    let time = ms(timeout - (Date.now() - cooldown));

    return interaction.reply({
      content: data.report_cooldown_command
        .replace("${time}", time)
    });
  } else {
    if (interaction.guild.ownerId != interaction.user.id) {
      return interaction.reply({ content: data.report_owner_need });
    };
    
    if (sentences.split(' ').length < 8) {
      return interaction.reply({ content: data.report_specify });
    };
    
    interaction.reply({ content: data.report_command_work });
    var embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setDescription(`**${interaction.user.username}#${interaction.user.discriminator}** (<@${interaction.user.id}>) reported:\n~~--------------------------------~~\n${sentences}\n~~--------------------------------~~\nServer ID: **${interaction.guild.id}**`)

    await client.channels.cache.get(config.core.reportChannelID).send({ embeds: [embed] });

    return await DataBaseModel({id: DataBaseModel.Set, key:`${interaction.guild.id}.USER.${interaction.user.id}.REPORT.cooldown`, value: Date.now()});
  }
};

module.exports = slashInfo.newfeatures.report;
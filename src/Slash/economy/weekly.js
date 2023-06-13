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

const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);
const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);

const ms = require('ms')
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

slashInfo.economy.weekly.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  let timeout = 604800000
  let amount = 1000

  let weekly = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.weekly` });

  if (weekly !== null && timeout - (Date.now() - weekly) > 0) {
    let time = ms(timeout - (Date.now() - weekly));

    interaction.reply({
      content: data.weekly_cooldown_error
        .replace(/\${time}/g, time)
    })
  } else {
    let embed = new EmbedBuilder()
      .setAuthor({ name: data.weekly_embed_title, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
      .setColor("#a4cb80")
      .setDescription(data.weekly_embed_description)
      .addFields({ name: data.weekly_embed_fields, value: `${amount}🪙` })


    await interaction.reply({ embeds: [embed] });

    return await DataBaseModel({ id: DataBaseModel.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: amount }),
      await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.weekly`, value: Date.now()});
  }
};

module.exports = slashInfo.economy.weekly;
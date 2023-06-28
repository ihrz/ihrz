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

const ms = require('ms');
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
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

slashInfo.economy.monthly.run = async (client, interaction) => {
  let data = await getLanguageData(interaction.guild.id);
  let timeout = 2592000000;
  let amount = 5000;

  let monthly = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.monthly` });

  if (monthly !== null && timeout - (Date.now() - monthly) > 0) {
    let time = ms(timeout - (Date.now() - monthly));

    return await interaction.reply({ content: data.monthly_cooldown_error.replace(/\${time}/g, time) });
  } else {
    let embed = new EmbedBuilder()
      .setAuthor({ name: data.monthly_embed_title, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
      .setColor("#a4cb80")
      .setDescription(data.monthly_embed_description)
      .addFields({ name: data.monthly_embed_fields, value: `${amount}🪙` })
    await interaction.reply({ embeds: [embed] });
    await DataBaseModel({ id: DataBaseModel.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: amount });
    await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.monthly`, value: Date.now() });
  };
};

module.exports = slashInfo.economy.monthly;
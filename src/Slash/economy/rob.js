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

slashInfo.economy.rob.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  const talkedRecentlyforr = new Set();

  if (talkedRecentlyforr.has(interaction.user.id)) {
    return interaction.reply({ content: data.rob_cooldown_error });
  }

  let user = interaction.options.getMember("member");
  let targetuser = await db.get(`${interaction.guild.id}.USER.${user.id}.ECONOMY.money`)
  let author = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`)
  if (author < 250) {
    return interaction.reply({ content: data.rob_dont_enought_error })
  }

  if (targetuser < 250) {
    return interaction.reply({
      content: data.rob_him_dont_enought_error
        .replace(/\${user\.user\.username}/g, user.user.username)
    })
  }
  let random = Math.floor(Math.random() * 200) + 1;

  let embed = new EmbedBuilder()
    .setDescription(data.rob_embed_description
      .replace(/\${interaction\.user\.id}/g, interaction.user.id)
      .replace(/\${user\.id}/g, user.id)
      .replace(/\${random}/g, random)
    )
    .setColor("#a4cb80")
    .setTimestamp()
  await interaction.reply({ embeds: [embed] });

  await db.sub(`${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, random)
  await db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, random)

  talkedRecentlyforr.add(interaction.user.id);
  setTimeout(() => {
    talkedRecentlyforr.delete(interaction.user.id);
  }, 3000000);
};

module.exports = slashInfo.economy.rob;
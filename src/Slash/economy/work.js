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

slashInfo.economy.work.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  const talkedRecentlyforw = new Set();

  if (talkedRecentlyforw.has(interaction.user.id)) {
    return message.channel.send(data.work_cooldown_error);
  };

  let amount = Math.floor(Math.random() * 200) + 1;

  let embed = new EmbedBuilder()
    .setAuthor({
      name: data.work_embed_author
        .replace(/\${interaction\.user\.username}/g, interaction.user.username)
        .replace(/\${interaction\.user\.discriminator}/g, interaction.user.discriminator)

      , iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`
    })
    .setDescription(data.work_embed_description
      .replace(/\${interaction\.user\.username}/g, interaction.user.username)
      .replace(/\${interaction\.user\.discriminator}/g, interaction.user.discriminator)
      .replace(/\${amount}/g, amount)
    )
    .setColor("#f1d488");

  await interaction.reply({ embeds: [embed] });
  await DataBaseModel({ id: DataBaseModel.Add, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: amount });

  talkedRecentlyforw.add(interaction.user.id);
  setTimeout(() => {
    talkedRecentlyforw.delete(interaction.user.id);
  }, 3600000);

};

module.exports = slashInfo.economy.work;
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
const axios = require('axios');

slashInfo.fun.dogs.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  axios.get('https://dog.ceo/api/breeds/image/random')
    .then(res => {
      const emb = new EmbedBuilder()
        .setImage(res.data.message).setTitle(data.dogs_embed_title).setTimestamp();

      return interaction.reply({ embeds: [emb] });
    })
    .catch(err => {
      logger.err(err); return interaction.reply(data.dogs_embed_command_error);
    });
};

module.exports = slashInfo.fun.dogs;
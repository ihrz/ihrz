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
const { QueryType, useQueue } = require('discord-player');

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
  name: 'shuffle',
  description: 'Shuffle all the music queue.',
  run: async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: data.shuffle_no_queue });
    if (queue.tracks.size < 2) return interaction.reply({ content: data.shuffle_no_enought });
    queue.tracks.shuffle();
    interaction.reply({ content: data.shuffle_command_work });
    return;
  }
}
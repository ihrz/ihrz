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

const { QuickDB } = require("quick.db");
const db = new QuickDB();
const {
  Client,
  Intents,
  Collection,
  EmbedBuilder,
  Permissions,
  ChannelType,
  ApplicationCommandType,
  PermissionsBitField,
  PermissionFlagsBits,
  ApplicationCommandOptionType
} = require('discord.js');

module.exports = {
  name: 'setup',
  description: 'Setup the bot, create a bot\'s logs channels',
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
      return interaction.reply(data.setup_not_admin);
    } 
    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
    if (!logchannel) {
      interaction.guild.channels.create({
        name: 'ihorizon-logs',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          }
        ],
      })
      interaction.reply({ content: data.setup_command_work })
    } else { return interaction.reply({ content: data.setup_command_error }) }
  }
}
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
const ms = require("ms");

const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
  name: 'tempmute',
  description: 'Tempmute a user in the guild',
  options: [
    {
      name: 'user',
      type: ApplicationCommandOptionType.User,
      description: 'The user you want to unmuted',
      required: true
    },
    {
      name: 'time',
      type: ApplicationCommandOptionType.String,
      description: 'the duration of the user\'s tempmute',
      required: true
    }
  ],
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    let mutetime = interaction.options.getString("time")
    let tomute = interaction.options.getMember("user")
    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    if (!permission) return interaction.reply({ content: data.tempmute_dont_have_permission });
    if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageMessages])) {
      return interaction.reply({ content: data.tempmute_i_dont_have_permission })
    }
    if (tomute.id === interaction.user.id) {
      return interaction.reply({ content: data.tempmute_cannot_mute_yourself });
    }
    let muterole = interaction.guild.roles.cache.find(role => role.name === 'muted');

    if (!muterole) {
      try {
        muterole = await interaction.guild.roles.create({
          name: "muted",
          reason: data.tempmute_reason_create_roles
        })

        interaction.guild.channels.cache.forEach(async (channel, id) => {
          await channel.permissionOverwrites.create(muterole, {
            SendMessages: false,
            AddReactions: false,
            SendMessagesInThreads: false
          });
        });
      } catch (e) {
      }
    }
    if (tomute.roles.cache.has(muterole.id)) {
      return interaction.reply({content: data.tempmute_already_muted})
    }
    await (tomute.roles.add(muterole.id));
    interaction.reply(data.tempmute_command_work
      .replace("${tomute.id}", tomute.id)
      .replace("${ms(ms(mutetime))}", ms(ms(mutetime)))
    );

    setTimeout(function () {
      if (!tomute.roles.cache.has(muterole.id)) { return }
      tomute.roles.remove(muterole.id);
      interaction.channel.send({content: data.tempmute_unmuted_by_time
        .replace("${tomute.id}", tomute.id)});
    }, ms(mutetime));

    try {
      logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9")
        .setTitle(data.tempmute_logs_embed_title)
        .setDescription(data.tempmute_logs_embed_description
          .replace("${interaction.user.id}", interaction.user.id)
          .replace("${tomute.id}", tomute.id)
          .replace("${ms(ms(mutetime))}", ms(ms(mutetime)))
          )

      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { logger.err(e) };
  }
}
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

const yaml = require('js-yaml');
const fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
  name: 'unmute',
  description: 'Unmute a muted user in the guild',
  options: [
    {
      name: 'user',
      type: ApplicationCommandOptionType.User,
      description: 'The user you want to unmuted',
      required: true
    }
  ],
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    let tomute = interaction.options.getMember("user")
    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
    if (!permission) return interaction.reply({ content: data.unmute_dont_have_permission });
    if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageRoles])) {
      return interaction.reply({ content: data.unmute_i_dont_have_permission })
    };
    if (tomute.id === interaction.user.id) return interaction.reply({ content: data.unmute_attempt_mute_your_self });
    let muterole = interaction.guild.roles.cache.find(role => role.name === 'muted');

    if (!tomute.roles.cache.has(muterole.id)) {
      return interaction.reply({ content: data.unmute_not_muted })
    }

    if (!muterole) {
      return interaction.reply({ content: data.unmute_muted_role_doesnt_exist })
    }

    tomute.roles.remove(muterole.id);
    interaction.reply({ content: data.unmute_command_work
    .replace("${tomute.id}", tomute.id)
    });
    try {
      logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9")
        .setTitle(data.unmute_logs_embed_title)
        .setDescription(data.unmute_logs_embed_description
          .replace("${interaction.user.id}", interaction.user.id)
          .replace("${tomute.id}", tomute.id)
        )

      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { logger.err(e) };
  }
}
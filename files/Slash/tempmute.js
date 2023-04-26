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

const yaml = require('js-yaml'), fs = require('fs');

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
    let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
    let data = yaml.load(fileContents);

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
    } catch (e) { console.error(e) };
  }
}
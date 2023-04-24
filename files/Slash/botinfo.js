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

const yaml = require('js-yaml'), fs = require('fs');

module.exports = {
  name: 'botinfo',
  description: 'Informations about the bot',
  run: async (client, interaction) => {

    let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8'); //
    let data = yaml.load(fileContents);

    let usersize = client.users.cache.size
    let chansize = client.channels.cache.size
    let servsize = client.guilds.cache.size
    let clientembed = new EmbedBuilder()
      .setColor("#f0d020")
      .setThumbnail(client.user.avatarURL({ format: 'png', dynamic: true, size: 512 }))
      .addFields(
        { name: data.botinfo_embed_fields_myname, value: `:green_circle: ${client.user.username}`, inline: false },
        { name: data.botinfo_embed_fields_mychannels, value: `:green_circle: ${chansize}`, inline: false },
        { name: data.botinfo_embed_fields_myservers, value: `:green_circle: ${servsize}`, inline: false },
        { name: data.botinfo_embed_fields_members, value: `:green_circle: ${usersize}`, inline: false },
        { name: data.botinfo_embed_fields_libraires, value: ":green_circle: discord.js@14.12.0", inline: false },
        { name: data.botinfo_embed_fields_created_at, value: ":green_circle: 14/09/2020", inline: false },
        { name: data.botinfo_embed_fields_created_by, value: ":green_circle: <@171356978310938624>", inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
      .setTimestamp()

    interaction.reply({ embeds: [clientembed] });
    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}
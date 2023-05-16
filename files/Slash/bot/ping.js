const { Client, Intents, Collection, MessageEmbed, EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
  name: 'ping',
  description: 'Pong in ms xd',
  run: async (client, interaction) => {
    const fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    const data = yaml.load(fileContents);

    await interaction.reply(':ping_pong:');

    var Ping = require('ping-wrapper');

    Ping.configure();


    var ping = new Ping('discord.com');

    ping.on('ping', function (data) {
      console.log('Ping %s: time: %d ms', data.host, data.time);
    });

    ping.on('fail', function (data) {
      console.log('Fail', data);
    });

    const embed = new EmbedBuilder()
      .setColor('#319938')
      .setTitle('Pong! 🏓')
      .setDescription(`**Network** : \`${networkPing}\`\n**Discord API** : \`${discordAPI}\``);

    await interaction.editReply({ content: '', embeds: [embed] });
  }
};
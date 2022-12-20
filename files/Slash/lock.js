const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
  name: 'lock',
  description: 'Remove ability to speak of all users in this text channel',
  run: async (client, interaction) => {


    const Lockembed = new MessageEmbed()
    .setColor("#5b3475")
    .setTimestamp()
    .setDescription(`The channel has been locked by <@${interaction.user.id}>.`);

    const permission = interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to lock channels."});

    interaction.channel.permissionOverwrites.create(interaction.guild.id, { SEND_MESSAGES: false }).then(() => {interaction.reply({embeds: [Lockembed]})})

    try{
      let ban_embed = new MessageEmbed()
              .setColor("PURPLE")
              .setTitle("Lock Logs")
              .setDescription(`<@${interaction.user.id}> lock <#${interaction.channel.id}>`)
      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      logchannel.send({embeds: [ban_embed]})
      }catch(e){
          return
      }
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}

const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
  name: 'unlock',
  description: 'Give ability to speak of all users in this text',
  run: async (client, interaction) => {

    const permission = interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to unlock channel."});
    const embed = new MessageEmbed()
    .setColor("#5b3475")
    .setTimestamp()
    .setDescription(`The channel has been successfully unlocked!`);
    interaction.channel.permissionOverwrites.create(interaction.guild.id, { SEND_MESSAGES: true });
        

          try{
            logEmbed = new MessageEmbed()
            .setColor("PURPLE")
            .setTitle("Unlock Logs")
            .setDescription(`<@${interaction.user.id}> unlock <#${interaction.channel.id}>`)

                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                    }catch(e) { console.error(e) };
                    
      return interaction.reply({embeds: [embed]});  

    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}
    
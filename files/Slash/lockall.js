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

module.exports = {
  name: 'lockall',
  description: 'Remove ability to speak of all users in all of text channel on the guild',
  run: async (client, interaction) => {

    const permission = interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to lockall channels."});
      interaction.guild.channels.cache.forEach(c => {
        c.permissionOverwrites.create(interaction.guild.id, { SEND_MESSAGES: false })
          })
          const Lockembed = new EmbedBuilder()
        .setColor("#5b3475")
        .setTimestamp()
        .setDescription(`All channels have been locked by <@${interaction.user.id}>.`);
try{
            logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle("Lockall Logs")
            .setDescription(`<@${interaction.user.id}> lock all channels !`)

                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                    }catch(e) { console.error(e) };
        return interaction.reply({embeds: [Lockembed]})
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}


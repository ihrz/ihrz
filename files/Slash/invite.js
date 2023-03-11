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
    name: 'invite',
    description: 'I love you, show me your love for me back ! Invite me !',
    run: async (client, interaction) => {
  
        let invites = new EmbedBuilder()
        .setColor("#416fec")
        .setTitle('Thank to adding iHorizon !')
        .setDescription("I love you, show me your love for me back! Invite me!")
        .setURL('https://discord.com/api/oauth2/authorize?client_id='+client.user.id+'&permissions=8&scope=bot')
        .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })})
        .setThumbnail(client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }))
        return interaction.reply({embeds: [invites]})  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
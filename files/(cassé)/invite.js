const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'invite',
    description: 'I love you, show me your love for me back ! Invite me !',
    run: async (client, interaction) => {
  
        let invites = new MessageEmbed()
        .setColor("CYAN")
        .setTitle('Thank to adding iHorizon !')
        .setURL('https://discord.com/api/oauth2/authorize?client_id='+client.user.id+'&permissions=8&scope=bot')
        .addField("**Invites Me!**", "Invites ME : **[Invites ME](https://discord.com/api/oauth2/authorize?client_id="+client.user.id+"&permissions=8&scope=bot)**")
        .setFooter('iHorizon thx !', 'https://cdn.discordapp.com/avatars/751402041359990885/5f6f6f7f1934ffeec54d050de4c3084d.png?size=1024')
        .setAuthor('iHorizon thx !', 'https://cdn.discordapp.com/avatars/751402041359990885/5f6f6f7f1934ffeec54d050de4c3084d.png?size=1024')
        .setThumbnail('https://cdn.discordapp.com/avatars/751402041359990885/5f6f6f7f1934ffeec54d050de4c3084d.png?size=1024')
        return interaction.reply({embeds: [invites]})  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
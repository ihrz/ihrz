const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'slap',
    description: 'slape someone !',
    options: [
        {
            name: "user",
            type: "USER",
            description: "The user you want to slap",
            required: true
        }
    ],
    
    run: async (client, interaction) => {
  
        var slap = [
            'https://cdn.discordapp.com/attachments/717813924203855882/717982041899139152/slap1.gif',
            'https://cdn.discordapp.com/attachments/717813924203855882/717982255661711381/slap2.gif',
            'https://cdn.discordapp.com/attachments/717813924203855882/717982464299106314/slap3.gif'
    
        ];
        const kiss2 = interaction.options.getUser("user")
        if(!kiss2) return message.reply(`I couldn't find a user.`);
    
        const embed = new MessageEmbed()
            .setColor("#42ff08")
            .setDescription("<@"+interaction.user.id+ `> slap <@${kiss2.id}> !`)
            .setImage(slap[Math.floor(Math.random()*slap.length)])
            .setTimestamp()
        return interaction.reply({embeds: [embed]});      
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
  
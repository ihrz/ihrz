const {MessageEmbed, } = require('discord.js');
module.exports = {
    name: 'hug',
    description: 'hug someone !',
    options: [
        {
            name: "user",
            type: "USER",
            description: "The user you want to hug",
            required: true
        }
    ],
    
    run: async (client, interaction) => {    
    const kiss = interaction.options.getUser("user");
    if(!kiss) return interaction.reply(`I couldn't find a user.`);

    
    var hug = [
        'https://cdn.discordapp.com/attachments/975288553787494450/1053838033373368350/hug.gif',
        'https://cdn.discordapp.com/attachments/975288553787494450/1053838033675366461/hug2.gif',
        'https://cdn.discordapp.com/attachments/975288553787494450/1053838033994129448/hug3.jpg',
        "https://cdn.discordapp.com/attachments/975288553787494450/1053838034191257650/hug4.jpg",
        "https://cdn.discordapp.com/attachments/975288553787494450/1053838034375815339/hug5.jpg"
    ];

    const embed = new MessageEmbed()
        .setColor("#FFB6C1")
        .setImage(hug[Math.floor(Math.random()*hug.length)])
        .setTimestamp()
    return interaction.reply({embeds: [embed]});    

}};
  
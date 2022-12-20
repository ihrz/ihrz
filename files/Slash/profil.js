const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
module.exports = {
    name: 'profil',
    description: 'See the iHorizon profils of discord user!',
    options: [
        {
            name: 'user',
            type: 'USER',
            description: 'The user you wan\'t to lookup',
            required: false
        }
    ],
    
    run: async (client, interaction) => {
  
        const db = require('quick.db')
        const member = interaction.options.getUser('user') || interaction.user
    
        var description = db.fetch(`pc_${member.id}_desc`)
        if(!description) var description = "Not descriptions definded !"
        var level = db.fetch(`level_${member.id}`)
        if(!level) var level = 0
        var balance = db.fetch(`money_${interaction.guild.id}_${member.id}`)
        if(!balance) var balance = 0
        var age = db.fetch(`pc_${member.id}_age`)
            if(!age) var age = "Unknown"
            
            let profil = new MessageEmbed()
                 .setTitle("📌 __Profile of " +member.tag+"__")
                 .setDescription(description)
                 .addField("📝 ・ __Nickname__", member.tag, false)
                 .addField("🪙 ・ __Money__", balance + " coins", false)
                 .addField("💳 ・ __XP Levels__", level + " XP Levels", false)
                 .addField("🎂 ・ __Age__", age + " years olds", false)
                 .setColor("DARK_ORANGE")
            interaction.reply({embeds: [profil]})  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
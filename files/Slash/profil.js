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
  
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
        const member = interaction.options.getUser('user') || interaction.user
    
        var description = db.fetch(`GLOBAL.USER_PROFIL.${member.id}.desc`)
        if(!description) var description = "Not descriptions definded !"
        var level = await db.fetch(`${interaction.guild.id}.USER.${member.id}.XP_LEVELING.level`)
        if(!level) var level = 0
        var balance = await db.fetch(`${interaction.guild.id}.USER.${member.id}.ECONOMY.money`)
        if(!balance) var balance = 0
        var age = await db.fetch(`GLOBAL.USER_PROFIL.${member.id}.age`)
            if(!age) var age = "Unknown"
            
            let profil = new MessageEmbed()
                 .setTitle("📌 __Profile of " +member.tag+"__")
                 .setDescription(`\`${description}\``)
                 .addField("📝 ・ __Nickname__", member.tag, false)
                 .addField("🪙 ・ __Money__", balance + " coins", false)
                 .addField("💳 ・ __XP Levels__", level + " XP Levels", false)
                 .addField("🎂 ・ __Age__", age + " years olds", false)
                 .setColor("DARK_ORANGE")
            interaction.reply({embeds: [profil]})  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
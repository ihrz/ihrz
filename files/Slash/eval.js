module.exports = {
    name: 'eval',
    description: 'Run Javascript program (only for developers)',
    options: [
        {
            name: 'code',
            type: 'STRING',
            description: 'javascript code',
            required: true
        }
    ],
    run: async (client, interaction) => {
  
        const db = require("quick.db")
        const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
        if(interaction.user.id != "171356978310938624") return;
        var result = interaction.options.getString("code")
            let evaled = eval(result);
            console.log(result)
    
        let embed = new MessageEmbed()
                .setColor("green")
                .setTitle("This block was evalued with iHorizon.")
                .setDescription("```"+result+"```")
                .setAuthor("Ezermoz#0001", "https://cdn.discordapp.com/avatars/740180226490761267/9a55252ccee7cd35f6583277127ae489.png?size=512")
                return interaction.reply({embeds: [embed], ephemeral: true})
}}
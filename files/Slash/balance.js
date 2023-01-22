const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    name: 'balance',
    description: 'show how much dollars you have in your bank',
    options: [
        {
            name: 'user',
            type: 'USER',
            description: 'Target a user for see their current balance bank or keep blank for yourself',
            required: false
        }
    ],
    run: async (client, interaction) => {
        const member = interaction.options.get('user')
        if(!member){
            var bal = db.fetch(`money_${interaction.guild.id}_${interaction.user.id}`)
            if(!bal){return db.set(`money_${interaction.guild.id}_${interaction.user.id}`, 1), interaction.reply({content: `👛 You dont't have wallet... !` })}
            interaction.reply({content: `👛 You have ${bal} coin(s) !` })
        }else{
            if(member){
                var bal = db.fetch(`money_${interaction.guild.id}_${member.value}`)
                if(!bal){return db.set(`money_${interaction.guild.id}_${member.value}`, 1), interaction.reply({content: `👛 he dont't have wallet... !` })}
                interaction.reply({content: `👛 He have ${bal} coin(s) !` })
            }}

  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
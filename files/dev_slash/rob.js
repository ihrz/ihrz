const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'rob',
    description: 'rob user money',
    options: [
        {
            name: 'member',
            type: 'USER',
            description: 'the member you want to rob a money',
            required: true
          }
    ],
    run: async (client, interaction) => {
  
        const talkedRecentlyforr = new Set();   
    
        if (talkedRecentlyforr.has(interaction.user.id)) {
                return interaction.reply({content: `**Wait 50minutes before rob user again !** ${interaction.member.user.username}#${interaction.member.user.discriminator}`});
        }
        let user = interaction.options.getMember("member")
        let targetuser = await db.get(`money_${interaction.guild.id}_${user.id}`) // fetch mentioned users balance
        let author = await db.get(`money_${interaction.guild.id}_${interaction.user.id}`) // fetch authors balance
        if (author < 250) { // if the authors balance is less than 250, return this.
            return interaction.reply({content: ':x: You need atleast 250$ to rob somebody.'})
        }
    
        if (targetuser < 250) { // if mentioned user has 0 or less, it will return this.
            return interaction.reply({content: `:x: ${user.user.username} does not have enought to rob.`})
        }
    
    
        let random = Math.floor(Math.random() * 200) + 1; // random number 200-1, you can change 200 to whatever you'd like
    
    
        let embed = new MessageEmbed()
        .setDescription(`<@${interaction.user.id}> you robbed <@${user.id}> and got away with ${random}!`)
        .setColor("GREEN")
        .setTimestamp()
        interaction.reply({embeds: [embed]})
    
    
        db.subtract(`money_${interaction.guild.id}_${user.id}`, random)
        db.add(`money_${interaction.guild.id}_${interaction.user.id}`, random)
    
        talkedRecentlyforr.add(interaction.user.id);
        setTimeout(() => {
          talkedRecentlyforr.delete(interaction.user.id);
        }, 3000000);
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
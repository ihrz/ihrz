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
        let targetuser = await db.get(`${interaction.guild.id}.USER.${user.id}.ECONOMY.money`)
        let author = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`)
        if (author < 250) {
            return interaction.reply({content: ':x: You need atleast 250$ to rob somebody.'})
        }
    
        if (targetuser < 250) {
            return interaction.reply({content: `:x: ${user.user.username} does not have enought to rob.`})
        }
        let random = Math.floor(Math.random() * 200) + 1;
    
        let embed = new MessageEmbed()
        .setDescription(`<@${interaction.user.id}> you robbed <@${user.id}> and got away with ${random}!`)
        .setColor("GREEN")
        .setTimestamp()
        interaction.reply({embeds: [embed]})
    
        await db.sub(`${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, random)
        await db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, random)
    
        talkedRecentlyforr.add(interaction.user.id);
        setTimeout(() => {
          talkedRecentlyforr.delete(interaction.user.id);
        }, 3000000);
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
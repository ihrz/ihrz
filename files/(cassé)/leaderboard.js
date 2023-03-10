const fs = require("fs");
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require('../config.json')

module.exports = {
    name: 'leaderboard',
    description: 'Show the guild invites\'s leaderboard',
    run: async (client, interaction) => {    
    var text = "**__Leaderboard :__**\n";
    const ownerList = await db.all();
    const foundArray = ownerList.findIndex(ownerList => ownerList.id === interaction.guild.id)
    const char = ownerList[foundArray].value.USER;

    for (var i in char){
       var a = await db.get(`${interaction.guild.id}.USER.${i}.INVITES.DATA`)      
        if(a) { 
            text += `<@${i}> Have **${a.invites || 0}** Invites (**${a.regular || 0}** Regular ** ${a.bonus || 0}** Bonus **${a.leaves || 0}** Leaves)\n` };
    };

    const embed = new MessageEmbed().setColor("#FFB6C1").setDescription(`${text}`).setTimestamp()
    
    return interaction.reply({embeds: [embed]});
}};

const fs = require("fs");
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require('../config.json')

module.exports = {
    name: 'owner',
    description: 'add user to owner list (can\'t be used by normal member)',
    options: [
        {
            name: 'member',
            type: 'USER',
            description: 'The member you want to made operator',
            required: false
        }
    ],
    
    run: async (client, interaction) => {
        var text = ""
    for (var i in db.all().filter(x => x.ID.startsWith(`owner_`))){
        text += `<@${db.all().filter(x => x.ID.startsWith(`owner_`))[i].ID.split("_")[1]}>\n`
        }

    let embed = new MessageEmbed()
                .setColor('#2E2EFE')
                .setAuthor('Owners')
                .setDescription(`${text}`)
                .setFooter('1/1 iHorizon')
    let member = interaction.options.getMember('member')
    if (!member) return interaction.reply({embeds: [embed]});
    if(db.fetch(`owner_${interaction.member.id}`) !== true) return interaction.reply("You are not operator !")
    let checkAx = db.fetch(`owner_${member.id}`)
    if(!checkAx!= true){
        return interaction.reply("This user is already owner !")
    }
    db.set(`owner_${member.user.id}`, true)
    interaction.reply(`${member.user.username} is now owner of the iHorizon Projects`)

      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
const fs = require("fs");
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const db = require('quick.db')
const config = require('../config.json')

module.exports = {
    name: 'unowner',
    description: 'Remove a owner of the list',
    options: [
        {
            name: 'member',
            type: 'USER',
            description: 'The member who wants to delete of the owner list',
            required: false
        }
    ],
    run: async (client, interaction) => {
        if(db.fetch(`owner_${interaction.member.id}`) !== true) return interaction.reply("You can't...")
        let member = interaction.options.getMember('member')
        if(!member) return interaction.reply("You'r have not typed the user you want to delete...")

            if(member.user.id === config.ownerid1 || member.user.id === config.ownerid2) {
                return interaction.reply("Is not possible to remove him, is the iHORIZON Projects Creator.")
            }
        db.delete(`owner_${member.user.id}`)
        interaction.reply(`${member.user.username} no longer owner`)

      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
  

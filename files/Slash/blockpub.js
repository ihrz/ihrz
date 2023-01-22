const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require("../config.json")

module.exports = {
    name: 'blockpub',
    description: 'Disable the member\'s spam with this command',
    options: [
        {
            name: 'entry',
            type: 'BOOLEAN',
            description: 'disable or enable the spam protection',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let turn = interaction.options.get("entry").value
        if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: ":x: | You must be an administrator of this server! "});
    
        if(turn === true){
            db.set(`antipub_${interaction.guild.id}`, "on")
            return interaction.reply({content: "📌 | The antipub is now functional (It works for everyone except admin)"})
        }
    
        if(turn === false){
            db.set(`antipub_${interaction.guild.id}`, "off")
            return interaction.reply({content: "📌 | The antipub is now deactivated!"})
        }
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
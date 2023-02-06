const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require("../config.json")

module.exports = {
    name: 'blockpub',
    description: 'Disable the member\'s spam with this command',
    options: [
        {
            name: 'action',
            type: "STRING",
            description: 'What you want to do?',
            required: true,
            choices: [
        {
            name: "Disable the spam protection",
            value: "off"
        },
        {
            name: 'Enable the spam protection',
            value: "on"
        },
    ],
},
],
    run: async (client, interaction) => {
        let turn = interaction.options.getString("action")
        if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: ":x: | You must be an administrator of this server! "});
    
        if(turn === true){
            await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, "on")
            return interaction.reply({content: "📌 | The antipub is now functional (It works for everyone except admin)"})
        }
    
        if(turn === false){
            await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, "off")
            return interaction.reply({content: "📌 | The antipub is now deactivated!"})
        }
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
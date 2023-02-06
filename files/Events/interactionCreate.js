const { QuickDB } = require("quick.db");
const db = new QuickDB();
const fs = require("fs")
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
module.exports = async (client, interaction) => {
       if (interaction.isCommand()) {
       const command = client.interactions.get(interaction.commandName);
       if (!command) return interaction.reply({
         content: "Connection error.",
         ephemeral: true
       });
        try{if (!interaction.guild.channels) return;}catch{return}
        if (interaction.user.bot == true) { return; }
        var potential_blacklisted = await db.get(`GLOBAL.BLACKLIST.${interaction.user.id}.blacklisted`)
        const blacklisted = new MessageEmbed()
          .setColor("#0827F5")
          .setTitle(":(")
          .setImage("https://media.discordapp.net/attachments/1047271029606723656/1049433666671087626/image.png?width=1358&height=676")
        if(potential_blacklisted === "yes") { return interaction.reply({embeds: [blacklisted]})};  

       command.run(client, interaction);
     }
async function logsCommands() {
  if (interaction.isCommand()) {
    const command = client.interactions.get(interaction.commandName);
    if(!command) return
    if (interaction.user.bot == true) { return; }
  const now = new Date();
  const CreateFiles = fs.createWriteStream('./files/logs/commands/'+interaction.guild.id+".txt", {
    flags: 'a'  
})
let i = `[${interaction.guild.name}] >> ${interaction.user.username}#${interaction.user.discriminator} - ${now}\n#${interaction.channel.name}: /${interaction.commandName}`
CreateFiles.write(i.toString()+'\r\n')
}}
logsCommands()

}

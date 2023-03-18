
const { 
    Client, 
    Intents, 
    Collection, 
    EmbedBuilder,
    Permissions, 
    ApplicationCommandType, 
    PermissionsBitField, 
    ApplicationCommandOptionType 
  } = require('discord.js');
const fs = require('fs');
const now = new Date();
const superagent = require('superagent');
module.exports = {
    name: 'nsfw',
    description: 'Nsfw command',
    run: async (client, interaction) => {
    
        if(interaction.channel.nsfw) { return interaction.reply({ content: 'This channel is not NSFW!', ephemeral: true });}
  
        const CreateFiles = fs.createWriteStream('./files/logs/pedo/'+interaction.guild.id+".txt", {
          flags: 'a'  
        })
        superagent
  .get(`http://french.myserver.cool:25600/random-image?t=${Date.now()}`)
  .end((err, res) => {
var URL = res.text;

let i = interaction.guild.name+" | PEDO | ["+now+"]"+" \n "+interaction.user.id
CreateFiles.write(i.toString()+'\r\n')

  const embed = new EmbedBuilder()
      .setColor("#ff0884")
      .setImage(`${URL}`)
      .setTimestamp()

  return interaction.reply({embeds: [embed]});      
});
   
      }};
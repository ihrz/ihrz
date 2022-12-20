const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const db = require("quick.db")
module.exports = {
  name: 'delchan',
  description: 'Delete you custom private channel',
  options: [
    {
        name: 'channel-id',
        type: 'STRING',
        description: 'The channel id (ONLY ADMINISTRATOR MODE) !',
        required: false
    }
],
run: async (client, interaction) => {
let wl_channel = db.fetch(`Here4CreateChannels_${interaction.guild.id}`)
  if(interaction.channel.id != wl_channel) return interaction.reply("Please type this command in specific channels !")
let monCulPoulet = interaction.options.getChannel("channel-id")
if(!monCulPoulet) {
    
        let alr_hchannel = db.fetch(`customchanstatus_${interaction.guild.id}_${interaction.user.id}`)
        if(alr_hchannel === 1){ 
            interaction.channel.send('deleting...')
            db.delete(`customchanstatus_${interaction.guild.id}_${interaction.user.id}`)

           let todel = db.fetch(`customchanID_${interaction.guild.id}_${interaction.user.id}`)
            const fetchedChannel = interaction.guild.channels.cache.get(todel);
            fetchedChannel.delete();
            db.delete(`customchanName_${interaction.guild.id}_${interaction.user.id}`)
            db.delete(`customchanID_${interaction.guild.id}_${interaction.user.id}`)
          return interaction.reply('Channels is succefully deleted !')
        }
            return interaction.reply("canceled...")
    } else{

      if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) { return interaction.reply("You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`")}
      let guild = client.guilds.cache.get(interaction.guild.id)
           let alr_hchannel = db.fetch(`customchanstatus_${interaction.guild.id}_${monCulPoulet}`)
           if(alr_hchannel === 1){ 
               interaction.channel.send('deleting...')
               db.delete(`customchanstatus_${interaction.guild.id}_${monCulPoulet}`)
   
              let todel = db.fetch(`customchanID_${interaction.guild.id}_${monCulPoulet}`)
               const fetchedChannel = interaction.guild.channels.cache.get(todel);
               fetchedChannel.delete();
               db.delete(`customchanName_${interaction.guild.id}_${monCulPoulet}`)
               db.delete(`customchanID_${interaction.guild.id}_${monCulPoulet}`)
             return interaction.reply('Channels is succefully deleted !')
           }
    }

   }};
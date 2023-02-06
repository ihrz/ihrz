const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
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
let wl_channel = await db.get(`${interaction.guild.id}.GUILD.CUSTOM_CHANNEL.Here4CreateChannels`)
  if(interaction.channel.id != wl_channel) return interaction.reply("Please type this command in specific channels !")
let monCulPoulet = interaction.options.getChannel("channel-id")
if(!monCulPoulet) {
    
        let alr_hchannel = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanstatus`)
        if(alr_hchannel === 1){ 
            interaction.channel.send('deleting...')
            db.delete(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanstatus`)

           let todel = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanID`)
            const fetchedChannel = interaction.guild.channels.cache.get(todel);
            fetchedChannel.delete();
            db.delete(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanName`)
            db.delete(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanID`)
          return interaction.reply('Channels is succefully deleted !')
        }
            return interaction.reply("canceled...")
    } else{

      if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) { return interaction.reply("You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`")}
      let guild = client.guilds.cache.get(interaction.guild.id)
           let alr_hchannel = await db.get(`${interaction.guild.id}.USER.${monCulPoulet}.CUSTOM_CHANNEL`)
           if(alr_hchannel === 1){ 
               interaction.channel.send('deleting...')
               db.delete(`customchanstatus_${interaction.guild.id}_${monCulPoulet}`)
   
              let todel = await db.get(`customchanID_${interaction.guild.id}_${monCulPoulet}`)
               const fetchedChannel = interaction.guild.channels.cache.get(todel);
               fetchedChannel.delete();
               db.delete(`customchanName_${interaction.guild.id}_${monCulPoulet}`)
               db.delete(`customchanID_${interaction.guild.id}_${monCulPoulet}`)
             return interaction.reply('Channels is succefully deleted !')
           }
    }

   }};
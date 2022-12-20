const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const db = require("quick.db");


module.exports = {
    name: 'delmembers',
    description: 'Remove a user in your private text channels',
    options: [
        {
            name: 'user',
            type: 'USER',
            description: 'The user you want to remove of your private text channel',
            required: true
        }
    ],
    run: async (client, interaction) => {
  
        let wl_channel = db.fetch(`Here4CreateChannels_${interaction.guild.id}`)
        if(interaction.channel.id != wl_channel) return interaction.reply("Please type this command in specific channels !")
            let usernametoadd = interaction.options.getUser("user")

        let d0de = db.fetch(`customchanstatus_${interaction.guild.id}_${interaction.user.id}`)
        if (d0de === undefined || d0de === null){ return interaction.reply("you dont have channels !")}
    
            let nameChan = db.fetch(`customchanID_${interaction.guild.id}_${interaction.user.id}`)
            const channel = client.channels.cache.get(nameChan);
            let guild = client.guilds.cache.get(interaction.guild.id)
           
         
            const member = interaction.options.getUser("user")
            if(!member) {
                return interaction.reply(`User don't find...`);
            }
            channel.permissionOverwrites.create(member.id, {
                VIEW_CHANNEL: false,
                SEND_MESSAGES: false,
                ATTACH_FILES: false,
                READ_MESSAGE_HISTORY: false
               })
               
               
               let addmessage = new MessageEmbed()
               .setColor('black')
               .setDescription(`${interaction.user.username}#${interaction.user.discriminator} remove ${usernametoadd} to this private channels text !`)
               .addField("Add Member to your channels", "```"+`/addmembers <Id of guys>\`\`\``)
               .addField("Remove Member to your channels", "```"+`/delmembers <Id of guys>\`\`\``)
               .addField("Delete your private channels !", "```"+`/delchan\`\`\``)
               .addField('Delete the private channels text of other members', "```"+`/delchan <id of guy>\`\`\``)
               .setFooter("iHORIZON")
               channel.send({embeds: [addmessage]})
            return interaction.reply('Succeffuly remove user to you private channels !')  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
}}
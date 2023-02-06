const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    name: 'addmembers',
    description: 'Add a user into your private text channels',
    options: [
        {
            name: 'user',
            type: 'USER',
            description: 'The user you want to add into your private text channel',
            required: true
        }
    ],
    run: async (client, interaction) => {
  
        let wl_channel = await db.get(`${interaction.guild.id}.GUILD.CUSTOM_CHANNEL.Here4CreateChannels`)
        if(interaction.channel.id != wl_channel) return interaction.reply("Please type this command in specific channels !")
            let usernametoadd = interaction.options.getUser("user")
    
        let d0de = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanstatus`)
        if (d0de === undefined || d0de === null){ return interaction.reply("you dont have channels !")}
            if(!usernametoadd){ return interaction.reply({embeds: [help_embed]})}
    
            let nameChan = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanID`)
            const channel = client.channels.cache.get(nameChan);
    try {
        const member = interaction.options.getUser("user")
        if(!member) {
            return interaction.reply(`User don't found !`);
        }
        channel.permissionOverwrites.create(member.id, {
            VIEW_CHANNEL: true,
            SEND_MESSAGES: true,
            ATTACH_FILES: true,
            READ_MESSAGE_HISTORY: true
           })
           
    
               
           let addmessage = new MessageEmbed()
           .setColor('black')
           .setDescription(`${interaction.user.username}#${interaction.user.discriminator} add <@${member.id}> to this private channels text !`)
           .addField("Add Member to your channels", "```"+`/addmembers <Id of guys>\`\`\``)
           .addField("Remove Member to your channels", "```"+`/delmembers <Id of guys>\`\`\``)
           .addField("Delete your private channels !", "```"+`/delchan\`\`\``)
           .addField('Delete the private channels text of other members', "```"+`/delchan <id of guy>\`\`\``)
           .setFooter("iHorizon")
           channel.send({embeds: [addinteraction]})
        return interaction.reply('Succeffuly add user to you private channels !')
    } catch (error) {
        console.log(`${error}`)
    }
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
  
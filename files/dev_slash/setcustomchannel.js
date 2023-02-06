module.exports = {
    name: 'setcustomchannel',
    description: 'Set the channel for custom private user channels',
    options: [
        {
            name: 'action',
            type: "STRING",
            description: 'What you want to do?',
            required: true,
            choices: [
        {
            name: "Remove the module",
            value: "off"
        },
        {
            name: 'Power on the module',
            value: "on"
        },
    ],
},
        {
            name: 'channel',
            type: 'CHANNEL',
            description: 'The channels for setup the custom private user channels',
            required: false
        }
    ],
    run: async (client, interaction) => {
  
        const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
        if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            return interaction.reply("You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`")
        }
        
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
        let type = interaction.options.getString("action")
        let channel1 = interaction.options.getChannel("channel")
        let help2_embed = new MessageEmbed()
            .setAuthor('You can create you custom channels text !')
            .setColor("RED")
            .setDescription("The owner of this server authorized @everyone to make a custom channels text ! \nNow, how to use :")
            .addField('Create a custom channels', `\`\`\`/createchan <name of channels>\`\`\``, true)
            .addField("Add Member to your channels", "```"+`/addmembers <Id of guys>\`\`\``)
            .addField("Remove Member to your channels", "```"+`/delmembers <Id of guys>\`\`\``)
            .addField("Delete your private channels !", "```"+`/delchan\`\`\``)
            .addField('Delete the private channels text of other members', "```"+`/delchan <id of guy>\`\`\``)
    
        if(type === 'on'){
            if(!channel1) { return interaction.reply('You not specified the channels id or channel does not exist!')}

        db.set(`Here4CreateChannels_${interaction.guild.id}`, channel1.id)
        
        interaction.reply('Succefully setup Here4CreateChannels Modules !')
            return channel1.send({embeds: [help2_embed]})
        }
        if(type === "off"){
             db.delete(`Here4CreateChannels_${interaction.guild.id}`)
            interaction.reply("Succeffuly removed Here4CreateChannels Modules !")
            return
        }
        return interaction.reply("canceled.")  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
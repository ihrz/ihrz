const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

    module.exports = {
      name: 'createchan',
      description: 'Create a custom private channel for you',
      options: [
        {
            name: 'channel-name',
            type: 'STRING',
            description: 'The channel name',
            required: true
        }
    ],
      run: async (client, interaction) => {
        let wl_channel = await db.get(`${interaction.guild.id}.GUILD.CUSTOM_CHANNEL.Here4CreateChannels`)
        if(interaction.channel.id != wl_channel) return interaction.reply({content: "Please type this command in specific channels !"})
            let chan_name = interaction.options.getString("channel-name")
            let firstMessageIntoPrivateTextChannels = new MessageEmbed()
                .setColor('black')
                .setAuthor(`Welcome to your private text channels, ${interaction.user.username}#${interaction.user.discriminator} !`)
                .setDescription("The owner of this server authorized @everyone to make a custom channels text ! \nNow, how to use :")
                .addField("Add Member to your channels", "```"+`/addmembers <Id of guy>\`\`\``)
                .addField("Remove Member to your channels", "```"+`/delmembers <Id of guy>\`\`\``)
                .addField("Delete your private channels", "```"+`/delchan\`\`\``)
                .addField('Delete the private channels text of other members', "```"+`/delchan <id of guy>\`\`\``)
                .setFooter("iHorizon")
                    
            let alr_hchannel = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanstatus`)
            if(alr_hchannel === 1){ return interaction.reply("You have already channels...")}
            interaction.channel.send('Creating...')
            db.set(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanstatus`, 1)
        
            interaction.guild.channels.create(chan_name, {
              type: "text",
              permissionOverwrites: [
                 {
                   id: interaction.guild.roles.everyone,
                   deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'] 
             },
             {
               id: interaction.user.id,
               allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'] 
             }
              ],
            }).then((channelsID) => {
              db.set(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanID`, channelsID.id),
              db.set(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.channel_log_custom`, interaction.user.id),
              client.channels.cache.get(channelsID.id).send({embeds: [firstMessageIntoPrivateTextChannels]})
            })
             db.set(`${interaction.guild.id}.USER.${interaction.user.id}.CUSTOM_CHANNEL.customchanName`, chan_name)
              return interaction.reply('Channels is succefully created !')    
        const filter = (interaction) => interaction.user.id === interaction.member.id;
        }}
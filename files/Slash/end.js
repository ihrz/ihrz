const ms = require('ms');
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'end',
    description: 'force end a giveaways',
    options: [
        {
            name: 'giveaway-id',
            type: 'STRING',
            description: 'The giveaway id (is the message id of the embed\'s giveaways)',
            required: true
        }
    ],
    run: async (client, interaction) => {
  
        const fuckingLifeOfTrees = interaction.options.getString("giveaway-id")
        if(!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){ return interaction.reply({content: 'You must have permissions to manage messages to end this giveaway.'});}
        if(!fuckingLifeOfTrees){ return interaction.reply({content: 'You must specify a valid message ID!'});}
    
        const giveaway =
        client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.prize === fuckingLifeOfTrees) ||
        client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.messageId === fuckingLifeOfTrees);
        if(!giveaway){return interaction.reply({content: `Could not find a giveaway for\`${fuckingLifeOfTrees}\`.`});}
    
        client.giveawaysManager
                .end(giveaway.messageId)
                .then(() => {
                    interaction.reply({content: `The giveaway will end in less than (${client.giveawaysManager.options.updateCountdownEvery/1000}) secondes...`});
                    try{
                        let ban_embed = new MessageEmbed()
                                .setColor("PURPLE")
                                .setTitle("Giveawyas Logs")
                                .setDescription(`<@${interaction.user.id}> ended giveaways with this id: ${giveaway.messageID}`)
                        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                        logchannel.send({embeds: [ban_embed]})
                        }catch(e){return}  
                })
                .catch((error) => {
                    if(error.startsWith(`Giveaway with message ID ${giveaway.messageId} has already been completed.`)){ return interaction.reply({content: 'This giveaway is already finished!'});
                }else{ return interaction.reply({content: `This giveaway is already finished!`});}
                });  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
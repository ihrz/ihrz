const ms = require('ms');
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
module.exports = {
    name: 'reroll',
    description: 'reroll a giveaways',
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
    if(!giveaway){return interaction.reply({content: `Could not find a giveaway for\`${args.join(' ')}\`.`});}

    client.giveawaysManager
            .reroll(giveaway.messageId)
            .then(() => {
                interaction.reply('Giveaway relaunched!');
 
                    try{
                        logEmbed = new MessageEmbed()
                        .setColor("PURPLE")
                        .setTitle("Giveaways Logs")
                        .setDescription(`<@${interaction.user.id}> reroll giveaways with this id: ${giveaway.messageID}`)

                                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                }catch(e) { console.error(e) };
                    
            })
            .catch((error) => {
                console.error(error)
                if(error.startsWith(`Giveaway with message Id ${giveaway.messageId} is not ended.`)){interaction.reply({content: `This giveaway is not over!`});}
                else {interaction.reply({content: `Error`});}
            });
        }};

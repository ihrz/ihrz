const sourcebin = require('sourcebin_js');
const { 
    Client, 
    Intents, 
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions, 
    ApplicationCommandType, 
    PermissionsBitField, 
    ApplicationCommandOptionType 
  } = require('discord.js');

	module.exports = {
		name: 'close',
		description: 'Close your ticket',
		run: async (client, interaction) => {
	  
			const { QuickDB } = require("quick.db");
			const db = new QuickDB();
			let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)
			if(blockQ === true) {
							
								return interaction.reply("You can't use this commands because an Administrator disable the ticket commands !")
							}
						
				if(interaction.channel.name.includes('ticket-')) {
					const member = interaction.guild.members.cache.get(interaction.channel.name.split('ticket-').join(''));
					if(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || interaction.channel.name === `ticket-${interaction.user.id}`) {
						interaction.channel.messages.fetch().then(async (messages) => {
							const output = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.tag}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');
		
							let response;
							try {
								response = await sourcebin.create([
									{
										name: ' ',
										content: output,
										languageId: 'text',
									},
								], {
									title: `Ticket transcript by iHorizon`,
									description: ' ',
								});
							}
							catch(e) {
								return interaction.reply('Error occurred, pls try again!');
							}
		try{
			const embed = new EmbedBuilder()
			.setDescription(`[\`View This\`](${response.url})`)
			.setColor('#5b92e5');
			interaction.reply({content: 'You have closed your ticket. iHorizon sent you the transcript', embeds: [embed]})
		}catch(e){
			console.error(e)
		
		}
						
							try {
								interaction.channel.permissionOverwrites.create(member.user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
								interaction.channel.send({content: `The ticket was succefully closed !`});
							}
							catch(e) {
								return interaction.channel.send('Error occurred, please try again!');
							}
						});
					}
				}
				else {
					return interaction.reply('You cannot use this command outside of a ticket channel !');
				}		  const filter = (interaction) => interaction.user.id === interaction.member.id;
		  }}
	  
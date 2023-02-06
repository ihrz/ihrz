module.exports = {
		name: 'new',
		description: 'Open a ticket if the ticket module is enable on the guild',
		run: async (client, interaction) => {
	  
			const { QuickDB } = require("quick.db");
			const db = new QuickDB();
			let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)

						if(blockQ === true) {
						
								return interaction.reply("You can't use this commands because an Administrator disable the ticket commands !") 
							
						}
				if(interaction.guild.channels.cache.find(channel => channel.name === `ticket-${interaction.user.id}`)) {
					return interaction.reply('You already have a ticket, please close your existing ticket!!');
				}
		
				interaction.guild.channels.create(`ticket-${interaction.user.id}`, {
					permissionOverwrites: [
						{
							id: interaction.user.id,
							allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
						},
						{
							id: interaction.guild.roles.everyone,
							deny: ['VIEW_CHANNEL'],
						},
					],
					type: 'text',
				}).then(async channel => {
					interaction.reply(`You have create a ticket succefully ! View this: ${channel}`);
					channel.send(`Hi ${interaction.user.username}, welcome to your ticket! Please be patient, we will be with you shortly. If you would like to close this ticket please run \`.close\``);
				});
		  const filter = (interaction) => interaction.user.id === interaction.member.id;
		  }}
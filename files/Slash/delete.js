

	module.exports = {
		name: 'delete',
		description: 'Delete a iHorizon ticket',
		run: async (client, interaction) => {
	  
			const { QuickDB } = require("quick.db");
			const db = new QuickDB();
			let blockQ = db.fetch(`ticket_oro_${interaction.guild.id}`)
						if(blockQ === true) {
							
								return interaction.re("You can't use this commands because an Administrator disable the ticket commands !")
							
						}
				if(interaction.channel.name.includes('ticket-')) {
					interaction.channel.delete();
				}
				else {
					return interaction.reply('You cannot use this command outside of a ticket channel !');
				}	  
		  const filter = (interaction) => interaction.user.id === interaction.member.id;
		  }}
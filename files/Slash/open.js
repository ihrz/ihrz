	module.exports = {
		name: 'open',
		description: 're-open a closed tickets',
		run: async (client, interaction) => {
	  
			const { QuickDB } = require("quick.db");
			const db = new QuickDB();
			let blockQ = db.fetch(`ticket_oro_${interaction.guild.id}`)
						if(blockQ === true) {
								return interaction.reply("You can't use this commands because an Administrator disable the ticket commands !")
							}
				if (interaction.channel.name.includes('ticket-')) {
					const member = interaction.guild.members.cache.get(interaction.channel.name.split('ticket-').join(''));
					try {
						interaction.channel.permissionOverwrites.edit(member.id, {
							VIEW_CHANNEL: true,
							SEND_MESSAGES: true,
							ATTACH_FILES: true,
							READ_MESSAGE_HISTORY: true,
						})
							.then(() => {
								return interaction.reply(`Successfully re-opened ${interaction.channel}`);
							});
					}
					catch (e) {
						return interaction.reply('Error occurred, please try again!');
					}
				}
				else {
					return interaction.reply('You cannot use this command outside of a ticket channel !');
				}	  
		  const filter = (interaction) => interaction.user.id === interaction.member.id;
		  }}
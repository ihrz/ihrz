	module.exports = {
		name: 'remove',
		description: 'Remove a member into your ticket',
		options: [
			{
				name: 'user',
				type: 'USER',
				description: 'The user you want to remove into your ticket',
				required: true
			}
		],
		
		run: async (client, interaction) => {
	  
			const { QuickDB } = require("quick.db");
			const db = new QuickDB();
			let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)

						if(blockQ === true) { return interaction.reply("You can't use this commands because an Administrator disable the ticket commands !")}
				if(interaction.channel.name.includes('ticket-')) {
					const member = interaction.options.getUser("user")
					if(!member) {
						return interaction.reply(`Incorrect Syntax ! **Correct Usage:** \`/remove <member>\``);
					}
					try{
						interaction.channel.permissionOverwrites.edit(member, {
							VIEW_CHANNEL: false,
							SEND_MESSAGES: false,
							ATTACH_FILES: false,
							READ_MESSAGE_HISTORY: false}).then(() => {
							interaction.reply(`Successfully removed ${member} to ${interaction.channel}`);
						});
					}
					catch(e) {
						console.log(e)
						return interaction.reply('error occurred, pls try again');
					}
				}  
		  const filter = (interaction) => interaction.user.id === interaction.member.id;
		  }}
	
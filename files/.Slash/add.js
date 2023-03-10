module.exports = {
	name: 'add',
	description: 'Add a member into your ticket',
	options: [
		{
			name: 'user',
			type: 'USER',
			description: 'The user you want to add into your ticket',
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
					return interaction.reply(`Incorrect Syntax ! **Correct Usage:** \`.add <member>\``);
				}
				try{
					interaction.channel.permissionOverwrites.edit(member, {
						VIEW_CHANNEL: true,
						SEND_MESSAGES: true,
						ATTACH_FILES: true,
						READ_MESSAGE_HISTORY: true}).then(() => {
						interaction.reply(`Successfully added ${member} to ${interaction.channel}`);
					});
				}
				catch(e) {
					return interaction.reply('error occurred, pls try again');
				}
			}  
	  const filter = (interaction) => interaction.user.id === interaction.member.id;
	  }}

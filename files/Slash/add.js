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
	name: 'add',
	description: 'Add a member into your ticket',
	options: [
		{
			name: 'user',
			type: ApplicationCommandOptionType.User,
			description: 'The user you want to add into your ticket',
			required: true
		}
	],

	run: async (client, interaction) => {

		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)
		if (blockQ === true) { return interaction.reply("You can't use this commands because an Administrator disable the ticket commands !") }
		if (interaction.channel.name.includes('ticket-')) {
			const member = interaction.options.getUser("user")
			if (!member) {
				return interaction.reply(`Incorrect Syntax ! **Correct Usage:** \`.add <member>\``);
			}
			try {
				interaction.channel.permissionOverwrites.create(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
				interaction.reply({ content: `Successfully added ${member.tag} to your ticket!` });
			}
			catch (e) {
				return interaction.reply('error occurred, pls try again');
			}
		}
		const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}

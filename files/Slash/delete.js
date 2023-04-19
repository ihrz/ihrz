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
	name: 'delete',
	description: 'Delete a iHorizon ticket',
	run: async (client, interaction) => {

		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)
		if (blockQ === true) {
			return interaction.reply("You can't use this commands because an Administrator disable the ticket commands !");
		}
		if (interaction.channel.name.includes('ticket-')) {
			interaction.channel.delete();
		}
		else {
			return interaction.reply('You cannot use this command outside of a ticket channel !');
		}
		const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}
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
const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
	name: 'delete',
	description: 'Delete a iHorizon ticket',
	run: async (client, interaction) => {
		let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
		let data = yaml.load(fileContents);

		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)
		if (blockQ === true) {
			return interaction.reply(data.delete_disabled_command);
		}
		if (interaction.channel.name.includes('ticket-')) {
			interaction.channel.delete();
		}
		else {
			return interaction.reply(data.delete_not_in_ticket);
		}
		const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}
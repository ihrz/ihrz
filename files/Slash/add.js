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
		let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
		let data = yaml.load(fileContents)

		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)
		if (blockQ === true) { return interaction.reply(data.add_disabled_command) }
		if (interaction.channel.name.includes('ticket-')) {
			const member = interaction.options.getUser("user")
			if (!member) {
				return interaction.reply(data.add_incorect_syntax);
			}
			try {
				interaction.channel.permissionOverwrites.create(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
				interaction.reply({ content: data.add_command_work.replace(/\${member\.tag}/g, member.tag)});
			}
			catch (e) {
				return interaction.reply(data.add_command_error);
			}
		}
	}
}

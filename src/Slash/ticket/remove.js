
const {
	Client,
	Intents,
	Collection,
	EmbedBuilder,
	Permissions,
	ApplicationCommandType,
	PermissionsBitField,
	ApplicationCommandOptionType
} = require('discord.js');

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

module.exports = {
	name: 'remove',
	description: 'Remove a member into your ticket',
	options: [
		{
			name: 'user',
			type: ApplicationCommandOptionType.User,
			description: 'The user you want to remove into your ticket',
			required: true
		}
	],

	run: async (client, interaction) => {
		let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
		let data = yaml.load(fileContents);
		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)

		if (blockQ === true) { return interaction.reply({content: data.remove_disabled_command}) }
		if (interaction.channel.name.includes('ticket-')) {
			const member = interaction.options.getUser("user")

			try {
				interaction.channel.permissionOverwrites.create(member, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
				interaction.reply({ content: data.remove_command_work.replace(/\${member\.tag}/g, member.tag) });
			}
			catch (e) {
				return interaction.reply(data.remove_command_error);
			}
		}else{
			return interaction.reply({content: data.remove_not_in_ticket})
		}
		const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}

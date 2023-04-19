const {
	Client,
	Intents,
	Collection,
	ChannelType,
	EmbedBuilder,
	Permissions,
	ApplicationCommandType,
	PermissionFlagsBits,
	PermissionsBitField,
	ApplicationCommandOptionType
} = require('discord.js');


module.exports = {
	name: 'sethereticket',
	description: 'Open a ticket if the ticket module is enable on the guild',
	options: [
		{
			name: "name",
			description: "The name of you ticket's panel.",
			type: ApplicationCommandOptionType.String,
			required: true,
		}
		// {
		// 	name: 'role',
		// 	type: ApplicationCommandOptionType.Role,
		// 	description: `The role you want to configure`,
		// 	required: false
		// }
	],
	run: async (client, interaction) => {
		let panelName = interaction.options.getString("name")

		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)
		if (blockQ === true) {
			return interaction.reply("You can't use this commands because an another Administrator disable the ticket commands !")
		}

		if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
			return interaction.reply(":x: | You must be an administrator of this server to request a this commands!");

		let panel = new EmbedBuilder()
			.setTitle(`${panelName}`)
			.setColor("#3b8f41")
			.setDescription("To create a new ticket, please react with 📩")
			.setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })

		interaction.channel.send({ embeds: [panel] }).then(async message => {
			message.react("📩")
			await db.set(`${message.guild.id}.GUILD.TICKET.${message.id}`,
				{
					author: interaction.user.id,
					used: true,
					panelName: panelName,
					channel: message.channel.id,
					messageID: message.id,
				})
		})

		interaction.reply({ content: "Ticket panel has been set successfully!", ephemeral: true })

		const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}
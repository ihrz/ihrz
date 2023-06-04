/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

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
		const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
		let data = await getLanguageData(interaction.guild.id);
		
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

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
	EmbedBuilder,
	Permissions,
	ApplicationCommandType,
	PermissionsBitField,
	ApplicationCommandOptionType
} = require('discord.js');

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
		const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
		let data = await getLanguageData(interaction.guild.id);
		
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

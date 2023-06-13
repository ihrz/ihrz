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

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.ticket.open.run = async (client, interaction) => {
	const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
	let data = await getLanguageData(interaction.guild.id);

	let blockQ = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.user.id}.GUILD.TICKET.on_or_off` });

	if (blockQ === true) {
		return interaction.reply(data.open_disabled_command)
	}
	if (interaction.channel.name.includes('ticket-')) {
		const member = interaction.guild.members.cache.get(interaction.channel.name.split('ticket-').join(''));
		try {
			interaction.channel.permissionOverwrites.edit(member.id, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true,
				ATTACH_FILES: true,
				READ_MESSAGE_HISTORY: true,
			})
				.then(() => {
					return interaction.reply(data.open_command_work.replace(/\${interaction\.channel}/g, interaction.channel));
				});
		}
		catch (e) {
			return interaction.reply(data.open_command_error);
		}
	}
	else {
		return interaction.reply(data.open_not_in_ticket);
	}
};

module.exports = slashInfo.ticket.open;
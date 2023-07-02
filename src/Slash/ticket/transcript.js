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

const sourcebin = require('sourcebin_js');
const { Client, Intents, Collection, EmbedBuilder, PermissionsBitField } = require(`${process.cwd()}/files/ihorizonjs`);

slashInfo.ticket.transcript.run = async (client, interaction) => {
	const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
	let data = await getLanguageData(interaction.guild.id);
	
	let blockQ = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.user.id}.GUILD.TICKET.on_or_off` });

	if (blockQ === true) {
		return interaction.reply({ content: data.transript_disabled_command })
	};
	
	const channel = interaction.channel;

	if (channel.name.includes('ticket-')) {
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || channel.name === `ticket-${interaction.user.id}`) {
			channel.messages.fetch().then(async (messages) => {
				const output = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.username}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');

				let response;
				try {
					response = await sourcebin.create([
						{
							name: data.transript_name_sourcebin,
							content: output,
							languageId: 'text',
						},
					], {
						title: data.transript_title_sourcebin.replace(/\${channel\.name}/g, channel.name),
						description: ' ',
					});
				}
				catch (e) {
					return interaction.reply(data.transript_command_error);
				}

				const embed = new EmbedBuilder()
					.setDescription(`[\`View this\`](${response.url})`)
					.setColor('#0014a8');
				interaction.reply({ embeds: [embed], content: data.transript_command_work });
			});
		}
	} else {
		return interaction.reply(data.transript_not_in_ticket);
	}
};

module.exports = slashInfo.ticket.transcript;
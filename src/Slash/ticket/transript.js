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

const sourcebin = require('sourcebin_js');
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');

module.exports = {
	name: 'transript',
	description: 'transript ticket\'s message',
	run: async (client, interaction) => {
		const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
		let data = await getLanguageData(interaction.guild.id);

		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)

		if (blockQ === true) {

			return interaction.reply({content: data.transript_disabled_command})

		}
		const channel = interaction.channel;
		if (channel.name.includes('ticket-')) {
			if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) || channel.name === `ticket-${interaction.user.id}`) {
				channel.messages.fetch().then(async (messages) => {
					const output = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.tag}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');

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
		}
		else {
			return interaction.reply(data.transript_not_in_ticket);
		}
		const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}

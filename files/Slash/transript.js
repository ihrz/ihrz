const sourcebin = require('sourcebin_js');
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');

const yaml = require('js-yaml'), fs = require('fs');
module.exports = {
	name: 'transript',
	description: 'transript ticket\'s message',
	run: async (client, interaction) => {
		let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8');
		let data = yaml.load(fileContents)

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

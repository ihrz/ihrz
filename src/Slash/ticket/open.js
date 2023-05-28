const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);
module.exports = {
	name: 'open',
	description: 're-open a closed tickets',
	run: async (client, interaction) => {
		let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
		let data = yaml.load(fileContents);

		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)

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
		const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}
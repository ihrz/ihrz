const sourcebin = require('sourcebin_js');
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

const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
	name: 'close',
	description: 'Close your ticket',
	run: async (client, interaction) => {
		const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
		let data = await getLanguageData(interaction.guild.id);

		const { QuickDB } = require("quick.db");
		const db = new QuickDB();
		let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)
		if (blockQ === true) {
			return interaction.reply(data.close_disabled_command)
		}

		if (interaction.channel.name.includes('ticket-')) {
			const member = interaction.guild.members.cache.get(interaction.channel.name.split('ticket-').join(''));
			if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || interaction.channel.name === `ticket-${interaction.user.id}`) {
				interaction.channel.messages.fetch().then(async (messages) => {
					const output = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.tag}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');

					let response;
					try {
						response = await sourcebin.create([
							{
								name: ' ',
								content: output,
								languageId: 'text',
							},
						], {
							title: data.close_title_sourcebin,
							description: data.close_description_sourcebin,
						});
					}
					catch (e) {
						return interaction.reply(data.close_error_command);
					}
					try {
						const embed = new EmbedBuilder()
							.setDescription(`[\`View This\`](${response.url})`)
							.setColor('#5b92e5');
						interaction.reply({ content: data.close_command_work_channel, embeds: [embed] })
					} catch (e) {
						logger.err(e)

					}

					try {
						interaction.channel.permissionOverwrites.create(member.user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
						interaction.channel.send({ content: data.close_command_work_notify_channel });
					}
					catch (e) {
						return interaction.channel.send(data.close_command_error);
					}
				});
			}
		}
		else {
			return interaction.reply(data.close_not_in_ticket);
		} const filter = (interaction) => interaction.user.id === interaction.member.id;
	}
}

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

slashInfo.ticket.sethereticket.run = async (client, interaction) => {
	const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
	let data = await getLanguageData(interaction.guild.id);

	let panelName = interaction.options.getString("name");

	let blockQ = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.user.id}.GUILD.TICKET.on_or_off` });

	if (blockQ === true) {
		return interaction.reply(data.sethereticket_disabled_command);
	}

	if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
		return interaction.reply(data.sethereticket_not_admin);
	}

	let panel = new EmbedBuilder()
		.setTitle(`${panelName}`)
		.setColor("#3b8f41")
		.setDescription(data.sethereticket_description_embed)
		.setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })

	interaction.channel.send({ embeds: [panel] }).then(async message => {
		message.react("📩");

		await DataBaseModel({
			id: DataBaseModel.Set, key: `${message.guild.id}.GUILD.TICKET.${message.id}`,
			value: {
				author: interaction.user.id,
				used: true,
				panelName: panelName,
				channel: message.channel.id,
				messageID: message.id,
			}
		});
	});

	return interaction.reply({ content: data.sethereticket_command_work, ephemeral: true });
};

module.exports = slashInfo.ticket.sethereticket;
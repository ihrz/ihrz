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

const {
	Client,
	Intents,
	Collection,
	EmbedBuilder,
	Permissions,
	ApplicationCommandType,
	PermissionsBitField,
	ApplicationCommandOptionType
} = require(`${process.cwd()}/files/ihorizonjs`);

const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.moderation.unmute.run = async (client, interaction) => {
	const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
	let data = await getLanguageData(interaction.guild.id);

	let tomute = interaction.options.getMember("user")
	const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
	if (!permission) return interaction.reply({ content: data.unmute_dont_have_permission });
	if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageRoles])) {
		return interaction.reply({ content: data.unmute_i_dont_have_permission })
	};
	if (tomute.id === interaction.user.id) return interaction.reply({ content: data.unmute_attempt_mute_your_self });
	let muterole = interaction.guild.roles.cache.find(role => role.name === 'muted');

	if (!tomute.roles.cache.has(muterole.id)) {
		return interaction.reply({ content: data.unmute_not_muted })
	}

	if (!muterole) {
		return interaction.reply({ content: data.unmute_muted_role_doesnt_exist })
	}

	tomute.roles.remove(muterole.id);
	interaction.reply({
		content: data.unmute_command_work
			.replace("${tomute.id}", tomute.id)
	});
	try {
		logEmbed = new EmbedBuilder()
			.setColor("#bf0bb9")
			.setTitle(data.unmute_logs_embed_title)
			.setDescription(data.unmute_logs_embed_description
				.replace("${interaction.user.id}", interaction.user.id)
				.replace("${tomute.id}", tomute.id)
			)

		let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
		if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
	} catch (e) { logger.err(e) };
};

module.exports = slashInfo.moderation.unmute;
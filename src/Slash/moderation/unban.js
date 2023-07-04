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

const { Client,
	Intents,
	EmbedBuilder,
	ApplicationCommandType,
	ApplicationCommandOptionType,
	Permissions,
	PermissionsBitField
} = require('discord.js');

const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.moderation.unban.run = async (client, interaction) => {
	const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
	let data = await getLanguageData(interaction.guild.id);

	if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
		return interaction.reply({ content: data.unban_dont_have_permission });
	}

	if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.BanMembers])) {
		return interaction.reply({ content: data.unban_bot_dont_have_permission })
	}

	const userID = interaction.options.getString('userid');
	let reason = interaction.options.getString('reason');
	if (!reason) reason = "No reason was provided."

	await interaction.guild.bans.fetch()
		.then(async bans => {
			if (bans.size == 0) {
				return await interaction.reply({ content: data.unban_there_is_nobody_banned });
			}
			let bannedID = bans.find(ban => ban.user.id == userID);
			if (!bannedID) return await interaction.reply({ content: data.unban_the_member_is_not_banned });
			await interaction.guild.bans.remove(userID, reason).catch(err => logger.err(err));
			await interaction.reply({
				content: data.unban_is_now_unbanned
					.replace(/\${userID}/g, userID)
			})
		})
		.catch(err => logger.err(err));

	try {
		logEmbed = new EmbedBuilder().setColor("#bf0bb9").setTitle("")
			.setDescription(data.unban_logs_embed_description
				.replace(/\${userID}/g, userID)
				.replace(/\${interaction\.user\.id}/g, interaction.user.id)
			)
		let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
		if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
	} catch (e) { logger.err(e) };
};

module.exports = slashInfo.moderation.unban;
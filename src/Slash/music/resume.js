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

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.music.resume.run = async (client, interaction, guild) => {
	let data = await getLanguageData(interaction.guild.id);

	try {
		const queue = interaction.client.player.nodes.get(interaction.guild)

		if (!queue || !queue.isPlaying()) {
			return interaction.reply({ content: data.resume_nothing_playing });
		}
		const paused = queue.node.setPaused(false);
		return interaction.reply({ content: data.resume_command_work });
	} catch (error) {
		logger.err(error);
	}
};

module.exports = slashInfo.music.resume;
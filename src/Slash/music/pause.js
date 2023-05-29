const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
    name: 'pause',
    description: '(music) freeze the music',
    run: async (client, interaction) => {
        let data = await getLanguageData(interaction.guild.id);

        if (!interaction.member.voice.channel) return interaction.reply({ content: data.pause_no_queue });
        try {
            const queue = interaction.client.player.nodes.get(interaction.guild);
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: data.pause_nothing_playing, ephemeral: true });
            }
            const paused = queue.node.setPaused(true);
            interaction.reply({ content: paused ? 'paused' : "something went wrong" });
            return;
        } catch (error) {
            logger.err(error);
        }
    }
}

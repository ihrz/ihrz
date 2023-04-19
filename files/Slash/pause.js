const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');

module.exports = {
    name: 'pause',
    description: '(music) freeze the music',
    run: async (client, interaction) => {
        if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);
        try {
            const queue = interaction.client.player.nodes.get(interaction.guild)

            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: "There is nothing playing", ephemeral: true })
            }

            const paused = queue.node.setPaused(true)
            return interaction.reply({ content: paused ? 'paused' : "something went wrong" })
        } catch (error) {
            console.log(error)
        }
    }
}

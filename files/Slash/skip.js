const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    name: 'skip',
    description: '(music) Skip the current music played.',
    run: async (client, interaction) => {
        if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);

        try {
            const queue = interaction.client.player.nodes.get(interaction.guild)

            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: "There is nothing playing" })
            }

            const currentTrack = queue.current
            const success = queue.node.skip()
            return interaction.reply({ content: `Skipped ${queue.currentTrack}` })
        } catch (error) {
            console.log(error)
        }

    }
}
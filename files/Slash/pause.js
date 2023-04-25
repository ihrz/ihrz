const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');

const yaml = require('js-yaml'), fs = require('fs');
module.exports = {
    name: 'pause',
    description: '(music) freeze the music',
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents);

        if (!interaction.member.voice.channel) return interaction.reply({ content: data.pause_no_queue });
        try {
            const queue = interaction.client.player.nodes.get(interaction.guild)
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: data.pause_nothing_playing, ephemeral: true })
            }
            const paused = queue.node.setPaused(true)
            return interaction.reply({ content: paused ? 'paused' : "something went wrong" })
        } catch (error) {
            console.log(error)
        }
    }
}

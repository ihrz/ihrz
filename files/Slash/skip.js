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

const yaml = require('js-yaml'), fs = require('fs');
module.exports = {
    name: 'skip',
    description: '(music) Skip the current music played.',
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents)

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: data.skip_not_in_voice_channel });
        }

        try {
            const queue = interaction.client.player.nodes.get(interaction.guild)

            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: data.skip_nothing_playing })
            }

            const currentTrack = queue.current
            const success = queue.node.skip()
            return interaction.reply({ content: data.skip_command_work
                .replace("{queue}", queue.currentTrack)
            })
        } catch (error) {
            console.log(error)
        }

        
    }
}
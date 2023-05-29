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

const logger = require(`${process.cwd()}/src/core/logger`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
    name: 'skip',
    description: '(music) Skip the current music played.',
    run: async (client, interaction) => {
        let data = await getLanguageData(interaction.guild.id);

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
            logger.err(error)
        }

        
    }
}
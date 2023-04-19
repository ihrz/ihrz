
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
const { QueueRepeatMode } = require('discord-player');
module.exports = {
    name: 'loop',
    description: '(music) Set loop mode of the guild',
    options: [
        {
            name: 'mode',
            type: ApplicationCommandOptionType.Integer,
            description: 'Loop Type',
            required: true,
            choices: [
                {
                    name: 'Off',
                    value: QueueRepeatMode.OFF
                },
                {
                    name: 'On',
                    value: QueueRepeatMode.TRACK
                }
            ]
        }
    ],
    run: async (client, interaction) => {
        try {

            const queue = interaction.client.player.nodes.get(interaction.guild)

            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: "There is no queue!" })
            }

            const loopMode = interaction.options.getNumber("select")

            queue.setRepeatMode(loopMode)
            const mode = loopMode === QueueRepeatMode.TRACK ? `🔂` : loopMode === QueueRepeatMode.QUEUE ? `🔂` : `▶`
            return interaction.reply({ content: `${mode} | Updated loop mode` })
        } catch (error) {
            console.log(error)
        }
        await interaction.reply({ embeds: [embed] });
    }
}

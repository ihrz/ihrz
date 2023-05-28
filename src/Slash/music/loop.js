
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

const logger = require(`${process.cwd()}/src/core/logger`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`)
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
        let data = getLanguageData(interaction.guild.id);
        try {
            const queue = interaction.client.player.nodes.get(interaction.guild)
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: data.loop_no_queue })
            }
            const loopMode = interaction.options.getNumber("select")

            queue.setRepeatMode(loopMode)
            const mode = loopMode === QueueRepeatMode.TRACK ? `🔂` : loopMode === QueueRepeatMode.QUEUE ? `🔂` : `▶`;
            return interaction.reply({ content: data.loop_command_work
                .replace("{mode}", mode)
            });
        } catch (error) {
            logger.err(error);
        }
        await interaction.reply({ embeds: [embed] });
    }
}

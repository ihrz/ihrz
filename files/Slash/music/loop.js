
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

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
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
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);
        try {
            const queue = interaction.client.player.nodes.get(interaction.guild)
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: data.loop_no_queue })
            }

            const loopMode = interaction.options.getNumber("select")

            queue.setRepeatMode(loopMode)
            const mode = loopMode === QueueRepeatMode.TRACK ? `🔂` : loopMode === QueueRepeatMode.QUEUE ? `🔂` : `▶`
            return interaction.reply({ content: data.loop_command_work
                .replace("{mode}", mode)
            })
        } catch (error) {
            console.log(error)
        }
        await interaction.reply({ embeds: [embed] });
    }
}

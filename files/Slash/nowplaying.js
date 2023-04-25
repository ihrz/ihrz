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

const yaml = require('js-yaml');
const fs = require('fs');

module.exports = {
    name: 'nowplaying',
    description: '(music) see the current music played',
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents);
        try {
            const queue = interaction.client.player.nodes.get(interaction.guild)
            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: data.nowplaying_no_queue, ephemeral: true })
            }
            const progress = queue.node.createProgressBar()
            const ts = queue.node.getTimestamp();
            const embed = new EmbedBuilder()
                .setTitle(data.nowplaying_message_embed_title)
                .setDescription(`[${queue.currentTrack.title}](${queue.currentTrack.url})`)
                .setThumbnail(`${queue.currentTrack.thumbnail}`)
                .addFields(
                    { name: '\200', value: progress.replace(/ 0:00/g, 'LIVE') }
                )
            await interaction.reply({ embeds: [embed] })
        } catch (error) {
            console.log(error)
        }
    }
}

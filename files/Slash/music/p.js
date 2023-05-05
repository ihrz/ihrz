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

const { QueryType, Player } = require('discord-player');

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
module.exports = {
    name: 'p',
    description: '(music) play a music',
    options: [
        {
            name: 'title',
            type: ApplicationCommandOptionType.String,
            description: 'The track title you want (you can put URL as you want)',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: data.p_not_in_voice_channel });
        }
        try {
            const check = interaction.options.getString("title")

            const result = await interaction.client.player.search(check, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO
            })


            const results = new EmbedBuilder()
                .setTitle(data.p_embed_title)
                .setColor(`#ff0000`)
                .setTimestamp()

            if (!result.hasTracks()) {
                return interaction.reply({ embeds: [results] })
            }

            await interaction.reply({ content: data.p_loading_message
            .replace("{result}", result.playlist ? 'playlist' : 'track')})

            const yes = await interaction.client.player.play(interaction.member.voice.channel?.id, result, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild?.members.me,
                        requestedBy: interaction.user.username
                    },
                    volume: 60,
                    bufferingTimeout: 3000,
                    leaveOnEnd: true
                },

            })

            const embed = new EmbedBuilder()
            function yess() {
                const totalDurationMs = yes.track.playlist.tracks.reduce((a, c) => c.durationMS + a, 0)
                const totalDurationSec = Math.floor(totalDurationMs / 1000);
                const hours = Math.floor(totalDurationSec / 3600);
                const minutes = Math.floor((totalDurationSec % 3600) / 60);
                const seconds = totalDurationSec % 60;
                const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                return durationStr
            }

            embed
                .setDescription(`${yes.track.playlist ? `**multiple tracks** from: **${yes.track.playlist.title}**` : `**${yes.track.title}**`}`)
                .setThumbnail(`${yes.track.playlist ? `${yes.track.playlist.thumbnail.url}` : `${yes.track.thumbnail}`}`)
                .setColor(`#d0ff00`)
                .setTimestamp()
                .setFooter({ text: data.p_duration+`${yes.track.playlist ? `${yess()}` : `${yes.track.duration}`}` })
            return interaction.editReply({ content: "", embeds: [embed] })
        } catch (error) {
        }
    }
}
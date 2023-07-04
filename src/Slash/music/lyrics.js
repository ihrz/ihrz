/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);
const { lyricsExtractor } = require('@discord-player/extractor');

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

const logger = require(`${process.cwd()}/src/core/logger`);
const lyricsFinder = lyricsExtractor();

slashInfo.music.lyrics.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    try {
        const title = interaction.options.getString("title");
        const lyrics = await lyricsFinder.search(title).catch(() => null);

        if (!lyrics) return interaction.reply({ content: 'No lyrics found', ephemeral: true });
        const trimmedLyrics = lyrics.lyrics.substring(0, 1997);

        const embed = new EmbedBuilder()
            .setTitle(lyrics.title)
            .setURL(lyrics.url)
            .setTimestamp()
            .setThumbnail(lyrics.thumbnail)
            .setAuthor({
                name: lyrics.artist.name,
                iconURL: lyrics.artist.image,
                url: lyrics.artist.url
            })
            .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
            .setColor('#cd703a')
            .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) });

        return interaction.reply({ embeds: [embed] });

    } catch (error) {
        logger.err(error);
    }
    await interaction.reply({ embeds: [embed] });
};

module.exports = slashInfo.music.lyrics;
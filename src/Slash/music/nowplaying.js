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

slashInfo.music.nowplaying.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    try {
        const queue = interaction.client.player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: data.nowplaying_no_queue, ephemeral: true });
        }
        const progress = queue.node.createProgressBar();
        const ts = queue.node.getTimestamp();
        const embed = new EmbedBuilder()
            .setTitle(data.nowplaying_message_embed_title)
            .setDescription(`[${queue.currentTrack.title}](${queue.currentTrack.url})`)
            .setThumbnail(`${queue.currentTrack.thumbnail}`)
            .addFields(
                { name: '\200', value: progress.replace(/ 0:00/g, 'LIVE') }
            );
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.err(error);
    }
};

module.exports = slashInfo.music.nowplaying;
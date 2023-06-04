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

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports.playerEvents = async (player) => {
    player.events.on('playerStart', async (queue, track) => {
        let data = await getLanguageData(queue.channel.guildId);

        queue.metadata.channel.send({
            content: data.event_mp_playerStart
                .replace("${track.title}", track.title)
                .replace("${queue.channel.name}", queue.channel.name)
        });
    });

    player.events.on('audioTrackAdd', async (queue, track) => {
        let data = await getLanguageData(queue.channel.guildId);

        queue.metadata.channel.send({
            content: data.event_mp_audioTrackAdd
                .replace("${track.title}", track.title)
        });
    });

    player.events.on('playerError', async (queue, error) => {
        let data = await getLanguageData(queue.channel.guildId);

        return logger.err(data.event_mp_playerError
            .replace("${error.message}", error.message)
        );
    });

    player.events.on('error', async (queue, error) => {
        let data = await getLanguageData(queue.channel.guildId);

        return logger.err(data.event_mp_error
            .replace("${error.message}", error.message)
        );
    });

    player.events.on('emptyChannel', async (queue) => {
        let data = await getLanguageData(queue.channel.guildId);

        if (queue > 2) player?.nodes.delete(queue.metadata);
        queue.metadata.channel.send({ content: data.event_mp_emptyChannel });
    });

    player.events.on('playerSkip', async (queue, track) => {
        let data = await getLanguageData(queue.channel.guildId);

        queue.metadata.channel.send({
            content: data.event_mp_playerSkip
                .replace("${track.title}", track.title)
        });
    });

    player.events.on('emptyQueue', async (queue) => {
        let data = await getLanguageData(queue.channel.guildId);

        queue.metadata.channel.send({ content: data.event_mp_emptyQueue });
    });
};
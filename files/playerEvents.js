const yaml = require('js-yaml');
const fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports.playerEvents = async (player) => {

    player.events.on('playerStart', async (queue, track) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(queue.channel.guildId)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        queue.metadata.channel.send({
            content: data.event_mp_playerStart
                .replace("${track.title}", track.title)
                .replace("${queue.channel.name}", queue.channel.name)
        });
    });

    player.events.on('audioTrackAdd', async (queue, track) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(queue.channel.guildId)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        queue.metadata.channel.send({
            content: data.event_mp_audioTrackAdd
                .replace("${track.title}", track.title)
        });
    });

    player.events.on('playerError', async (queue, error) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(queue.channel.guildId)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        return console.log(data.event_mp_playerError
            .replace("${error.message}", error.message)
        );
    });

    player.events.on('error', async (queue, error) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(queue.channel.guildId)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        return console.log(data.event_mp_error
            .replace("${error.message}", error.message)
        );
    });

    player.events.on('emptyChannel', async (queue) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(queue.channel.guildId)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        if (queue > 2) player?.nodes.delete(queue.metadata);
        queue.metadata.channel.send({ content: data.event_mp_emptyChannel })
    });

    player.events.on('playerSkip', async (queue, track) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(queue.channel.guildId)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        queue.metadata.channel.send({
            content: data.event_mp_playerSkip
                .replace("${track.title}", track.title)
        });
    });

    player.events.on('emptyQueue', async (queue) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(queue.channel.guildId)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        await queue.metadata.channel.send({ content: data.event_mp_emptyQueue })
    })
};
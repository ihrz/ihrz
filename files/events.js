module.exports.registerPlayerEvents = (player) => {
    player.on("error", (queue, error) => {
        console.log(`[${queue.guild.name}] Error emitted from the queue: ${error.message}`);
    });
    
    player.on("connectionError", (queue, error) => {
        console.log(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`);
    });

    player.on("trackStart", (queue, track) => {
        queue.metadata.send(`🎵 - Now playing \`${track.title}\` into **${queue.connection.channel.name}** ...`);
    });

    player.on("trackAdd", (queue, track) => {
        queue.metadata.send(`:musical_note: - ${track.title} has been added to the queue !`);
    });

    player.on("botDisconnect", (queue) => {
        queue.metadata.send("❌ | I was manually disconnected from the voice channel, clearing queue!");
    });

    player.on("channelEmpty", (queue) => {
        queue.metadata.send("❌ | Nobody is in the voice channel, leaving...");
    });

    player.on("queueEnd", (queue) => {
        queue.metadata.send(`⚠️ - Music stopped as there is no more music in the queue !`);
    });
};

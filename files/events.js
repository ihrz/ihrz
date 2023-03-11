const { VoiceConnectionStatus } = require('@discordjs/voice');

module.exports.registerPlayerEvents = (player) => {
    player.on("error", (queue, error) => {
        console.log(`[${queue.guild.name}] Error emitted from the queue`);
    });
    
    // player.on('connectionCreate', (queue) => {
    //     queue.connection.voiceConnection.on('stateChange', (oldState, newState) => {
    //       const oldNetworking = Reflect.get(oldState, 'networking');
    //       const newNetworking = Reflect.get(newState, 'networking');
    
    //       const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
    //         const newUdp = Reflect.get(newNetworkState, 'udp');
    //         clearInterval(newUdp?.keepAliveInterval);
    //       }
    
    //       oldNetworking?.off('stateChange', networkStateChangeHandler);
    //       newNetworking?.on('stateChange', networkStateChangeHandler);
    //     });
    // });

    player.on("connectionError", (queue, error) => {
        console.log(`[${queue.guild.name}] Error emitted from the connection`);
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

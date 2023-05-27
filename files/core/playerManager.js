const { Player } = require("discord-player");
const { playerEvents } = require(__dirname + "/../playerEvents.js");

module.exports = (client) => {
  const player = new Player(client, {ytdlOptions: {quality: "highestaudio", smoothVolume: true, highWaterMark: 1 << 25}});
  playerEvents(player);
  client.player = player;
};
const { GiveawaysManager } = require('discord-giveaways');

module.exports = (client) => {
  const manager = new GiveawaysManager(client, {
    storage: __dirname+"/../giveaways.json",
    updateCountdownEvery: 5000,
    embedColor: "#FF0000",
    reaction: "🎉",
    default: {
      botsCanWin: false,
      exemptPermissions: ["MANAGE_MESSAGES", "ADMINISTRATOR"]
    }
  });

  client.giveawaysManager = manager;
}
const { GiveawaysManager } = require(`${process.cwd()}/files/discord-giveaways`);

module.exports = (client) => {
    const manager = new GiveawaysManager(client);
    client.giveawaysManager = manager;
};
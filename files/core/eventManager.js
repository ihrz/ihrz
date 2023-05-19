const fs = require('fs');
const path = require('path');
require("colors");
const logger = require("./logger")
const config = require(`${process.cwd()}/files/config`);

module.exports = (client) => {
  const eventFiles = fs.readdirSync(path.resolve(__dirname, '..', 'Events')).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.resolve(__dirname, '..', 'Events', file));
    const eventName = file.split('.')[0];

    logger.log(`[${config.console.emojis.OK}] >> ${eventName}`.white);
    client.on(eventName, event.bind(null, client));
  };
};
const fs = require("fs");
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = (client, callback) => {
  const result = {};

  fs.readdir(__dirname + "/../Slash/", (err, categories) => {
    if (err) logger.err(err);

    let filesCount = 0;
    categories.forEach((category) => {
      result[category] = [];

      fs.readdir(`${__dirname}/../Slash/${category}`, (err, files) => {
        if (err) logger.err(err);

        filesCount += files.length;

        files.forEach((file) => {
          if (!file.endsWith(".js")) {
            filesCount--;
            return;
          }

          const props = require(`${__dirname}/../Slash/${category}/${file}`);
          const commandName = file.split(".")[0];
          client.interactions.set(commandName, { name: commandName, ...props });
          client.register_arr.push(props);

          result[category].push(`\`/${commandName}\``);
          filesCount--;
        });
      });
    });

    const interval = setInterval(() => {
      if (filesCount === 0) {
        clearInterval(interval);
        callback(result)
      }
    }, 100);
  });
};
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

const fs = require("fs");
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = async (client, callback) => {
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

          result[category].push(`\`${commandName}\``);
          filesCount--;
        });
      });
    });

    const interval = setInterval(() => {
      if (filesCount === 0) {
        clearInterval(interval);
        callback(result)
      }
    }, 500);
  });
};
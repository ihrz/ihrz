const fs = require("fs");

module.exports = (client) => {
  const result = {};

  fs.readdir(__dirname+"/../Slash/", (err, categories) => {
    if (err) console.error(err);
    categories.forEach((category) => {
      result[category] = [];

      fs.readdir(`${__dirname}/../Slash/${category}`, (err, files) => {
        if (err) console.error(err);

        files.forEach((file) => {
          if (!file.endsWith(".js")) return;

          const props = require(`${__dirname}/../Slash/${category}/${file}`);
          const commandName = file.split(".")[0];
          client.interactions.set(commandName, { name: commandName, ...props });
          client.register_arr.push(props);

          result[category].push(commandName);
        });
      });
    });
  });

  return result;
};
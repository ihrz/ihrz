const fs = require('fs'),
  date = require('date-and-time'),
  config = require('../config'),
  logger = require("./logger");

function uncaughtExceptionHandler() {
  process.on('uncaughtException', function (err) {

    if (!config.core.devMode) {

      logger.err("【💥】 >> Error detected".red)
      logger.err("【📜】 >> Save in the logs".gray);
      const now = new Date(),
        CreateFiles = fs.createWriteStream(__dirname + '/../logs/crash/' +
          date.format(now, 'DD.MM.YYYY HH;mm;ss') + ".txt", { flags: 'a' });
      let i = `${config.core.asciicrash}\n${err.stack || err.message}`;
      CreateFiles.write(i.toString() + '\r\n');
      console.log(err.stack || err.message);
    } else { console.log(err.stack || err.message); };
  });
};

module.exports.uncaughtExceptionHandler = uncaughtExceptionHandler;
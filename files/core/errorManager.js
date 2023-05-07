const fs = require('fs'),
      date = require('date-and-time'),
      config = require('../config.json');

function uncaughtExceptionHandler() {
  process.on('uncaughtException', function (err) {
    console.log(err.stack || err.message);
    console.log("[  💥  ] >> Crash detected\n".red +
      "[  📜  ] >> Save in the logs\n".gray +
      "[  💖  ] >> Don't need to restart".green);
    const now = new Date(),
          CreateFiles = fs.createWriteStream(__dirname+'/../logs/crash/' +
          date.format(now, 'DD.MM.YYYY HH;mm;ss') + ".txt", { flags: 'a' });
    let i = `${config.asciicrash}\n${err.stack || err.message}`;
    CreateFiles.write(i.toString() + '\r\n');
  });
}

module.exports = {
    uncaughtExceptionHandler
  };
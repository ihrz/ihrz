const fs = require('fs'),
    date = require('date-and-time'),
    config = require(`${process.cwd()}/files/config.js`),
    logger = require("./logger");

function uncaughtExceptionHandler() {

    process.on('uncaughtException', function (err) {
        if (!config.core.devMode) {
            logger.err("💥 >> Error detected".red), logger.err("📜 >> Save in the logs".gray);

            let filesPath = process.cwd() + '/files/logs/crash/' + date.format((new Date()), 'DD.MM.YYYY HH;mm;ss') + '.txt';

            CreateFiles = fs.createWriteStream(filesPath, {flags: 'a'});

            let i = `${config.core.asciicrash}\n${err.stack || err.message}\r\n`;

            return CreateFiles.write(i);
        };

        console.error(err.stack || err.message);
    });
};

module.exports.uncaughtExceptionHandler = uncaughtExceptionHandler;
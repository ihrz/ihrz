const getLanguage = require("./getLanguage.js"), 
    yaml = require('js-yaml'), 
    fs = require('fs');

module.exports = async (Guildid) => yaml.load(fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(Guildid)}.yml`, 'utf-8'));
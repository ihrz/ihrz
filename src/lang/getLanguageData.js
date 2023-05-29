const yaml = require('js-yaml'),
    fs = require('fs'),
    { QuickDB } = require("quick.db"),
    db = new QuickDB();

async function getLanguageData(arg) {
    let fetched = await db.get(`${arg}.GUILD.LANG`);
    if (!fetched) { return yaml.load(fs.readFileSync(`${process.cwd()}/src/lang/en-US.yml`, 'utf-8')); };
    return await yaml.load(fs.readFileSync(`${process.cwd()}/src/lang/${fetched.lang}.yml`, 'utf-8'));
}

module.exports = getLanguageData;
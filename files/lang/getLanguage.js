const { QuickDB } = require("quick.db"), db = new QuickDB();

async function getLanguage(arg) {
    let fetched = await db.get(`${arg}.GUILD.LANG`);
    if(!fetched) { return "en-US"; };
    return fetched.lang;
}

module.exports = getLanguage;

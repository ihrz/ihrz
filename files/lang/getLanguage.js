const { QuickDB } = require("quick.db");
const db = new QuickDB();

async function getLanguage(arg) {
    let fetched = await db.get(`${arg}.GUILD.LANG`)
    if(!fetched) {
        fetched = "en-US"
        resultat = fetched;
    } else {
        resultat = fetched.lang
    }
    return resultat;
}

module.exports = getLanguage;

const { QuickDB } = require('quick.db');
const db = new QuickDB();
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = async (req, res) => {
    const { tokent, userid, tor, adminKey } = req.body;
    if (!userid || !adminKey) return logger.warn("-> Bad json request without ip/key");
    if (!tor == 'CHECK_IN_SYSTEM') {
        logger.warn('-> Bad json requests without options');
        return res.send('-> Bad json requests without options');
    }
    if (tor == "CHECK_IN_SYSTEM") {
        const { userid, adminKey, tokent } = req.body;
        if (!userid || !adminKey) return logger.warn("-> Bad json request without ip/key");
        if (adminKey != require(`${process.cwd()}/files/config.js`).api.apiToken) return;
        let value = await db.get(`API.TOKEN.${userid}`);
        if (!value) { return res.json({ available: "no", id: userid, adminKey: "ok" }); };
        try {
            await oauth.getUser(value.token);
            res.json({ connectionToken: value.token, available: "yes", id: userid, adminKey: "ok" });
        } catch (e) {
            await db.delete(`API.TOKEN.${userid}`);
            res.json({ available: "no", id: "deleted", adminKey: "ok" });
            return;
        }
    }
    return;
};
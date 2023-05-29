const DiscordOauth2 = require("discord-oauth2"), oauth = new DiscordOauth2(), logger = require(`${process.cwd()}/src/core/logger`);
const { DataBaseModel } = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (req, res) => {
    const { userid, tor, adminKey } = req.body;
    if (!userid || !adminKey) return logger.warn("-> Bad json request without ip/key");
    if (tor == "CHECK_IN_SYSTEM") {
        const { userid, adminKey } = req.body;
        if (!userid || !adminKey) return logger.warn("-> Bad json request without ip/key");
        if (adminKey != require(`${process.cwd()}/files/config.js`).api.apiToken) return;
        let value = await new DataBaseModel({ id: DataBaseModel.Get, key: `API.TOKEN.${userid}` });

        if (!value) { return res.json({ available: "no", id: userid, adminKey: "ok" }); };

        try {
            await oauth.getUser(value.token); res.json({ connectionToken: value.token, available: "yes", id: userid, adminKey: "ok" });
        } catch (e) {
            await new DataBaseModel({id: DataBaseModel.Delete, key: `API.TOKEN.${userid}`});

            return res.json({ available: "no", id: "deleted", adminKey: "ok" });
        };
        return;
    };
    logger.warn('-> Bad json requests without options');
    return res.send('-> Bad json requests without options');
};
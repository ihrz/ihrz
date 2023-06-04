/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const DiscordOauth2 = require("discord-oauth2"), 
    oauth = new DiscordOauth2(), 
    logger = require(`${process.cwd()}/src/core/logger`),
    DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (req, res) => {
    const { userid, tor, adminKey } = req.body;
    if (!userid || !adminKey) return logger.warn("-> Bad json request without ip/key");
    if (tor == "CHECK_IN_SYSTEM") {
        const { userid, adminKey } = req.body;
        if (!userid || !adminKey) return logger.warn("-> Bad json request without ip/key");
        if (adminKey != require(`${process.cwd()}/files/config.js`).api.apiToken) return;
        let value = await DataBaseModel({id: DataBaseModel.Get, key: `API.TOKEN.${userid}`});
        if (!value) { return res.json({ available: "no", id: userid, adminKey: "ok" }); };

        try {
            await oauth.getUser(value.token); res.json({ connectionToken: value.token, available: "yes", id: userid, adminKey: "ok" });
        } catch (e) {
            await DataBaseModel({id: DataBaseModel.Delete, key: `API.TOKEN.${userid}`});

            return res.json({ available: "no", id: "deleted", adminKey: "ok" });
        };
        return;
    };
    logger.warn('-> Bad json requests without options');
    return res.send('-> Bad json requests without options');
};
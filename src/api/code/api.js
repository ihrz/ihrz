const { QuickDB } = require('quick.db'), db = new QuickDB();
var CryptoJS = require("crypto-js");
const logger = require(`${process.cwd()}/src/core/logger.js`);
const config = require(`${process.cwd()}/files/config.js`);

module.exports = async (req, res) => {
    const { text } = req.body;

    try {
        var bytes = CryptoJS.AES.decrypt(text, config.api.apiToken);
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        switch (decryptedData.id) {
            case 1:
                await db.set(decryptedData.key, decryptedData.value);
                res.sendStatus(200);
                break;
            case 2:
                await db.push(decryptedData.key, decryptedData.value);
                res.sendStatus(200);
                break;
            case 3:
                await db.sub(decryptedData.key, decryptedData.value);
                res.sendStatus(200);
                break;
            case 4:
                await db.add(decryptedData.key, decryptedData.value);
                res.sendStatus(200);
                break;
            case 5:
                let callback = await db.get(decryptedData.key, decryptedData.value);
                res.send({callback});
                break;
            case 6:
                await db.delete(decryptedData.key, decryptedData.value);
                res.sendStatus(200);
                break;
            case 7:
                await db.all(decryptedData.key, decryptedData.value);
                res.sendStatus(200);
                break;
            default:
                logger.warn("-> Bad json request without ip/key");
                res.sendStatus(403);
                return;
        };

        return;
    } catch (e) {
        res.sendStatus(403);
        return logger.warn("-> Bad json request without ip/key");
    };
};
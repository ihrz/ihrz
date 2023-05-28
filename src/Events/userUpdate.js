const { QuickDB } = require("quick.db"), db = new QuickDB();
const { time } = require('discord.js');

module.exports = async (client, oldUser) => {
    async function serverLogs() {
        if (!oldUser) return;
        const someinfo = await db.get(`DB.PREVNAMES.${oldUser.id}`);
        var char = `${time((new Date()), 'd')} - ${oldUser.username}#${oldUser.discriminator}`;
        if (someinfo) { await db.push(`DB.PREVNAMES.${oldUser.id}`, char); } else { await db.push(`DB.PREVNAMES.${oldUser.id}`, char) }
    };

    await serverLogs();
};
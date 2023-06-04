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

const { QuickDB } = require("quick.db"), db = new QuickDB();
const { time } = require('discord.js');

module.exports = async (client, oldUser) => {
    async function serverLogs() {
        oldUsertag = oldUser.username+'#'+oldUser.discriminator;
        newUser = await client.users.fetch(oldUser.id);
        newUsertag = newUser.username+'#'+newUser.discriminator;

        if (oldUsertag === newUsertag) return;
        if (!oldUser) return;
        
        const someinfo = await db.get(`DB.PREVNAMES.${oldUser.id}`);
        var char = `${time((new Date()), 'd')} - ${oldUser.username}#${oldUser.discriminator}`;
        if (someinfo) { await db.push(`DB.PREVNAMES.${oldUser.id}`, char); } else { await db.push(`DB.PREVNAMES.${oldUser.id}`, char) };
    };

    await serverLogs();
};
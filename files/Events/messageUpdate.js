const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, oldMessage, newMessage) => {

    async function serverLogs() {
        if (!oldMessage) return;
        if (!oldMessage.guild) return;
        if (oldMessage.author.bot) return;
        
        const guildId = oldMessage.guildId;
        const someinfo = await db.get(`${guildId}.GUILD.SERVER_LOGS.message`);

        if (!someinfo) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: newMessage.author.username, iconURL: newMessage.author.avatarURL({ format: 'png', dynamic: true, size: 512 }) })
            .setDescription(`**Message édité dans <#${oldMessage.channelId}>**`)
            .setFields({ name: "Avant", value: oldMessage.content }, { name: "Après", value: newMessage.content })
            .setTimestamp();

        await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
    };

    await serverLogs();
};
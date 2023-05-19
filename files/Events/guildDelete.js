const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require(`${process.cwd()}/files/config.js`)

module.exports = async (client, guild) => {

    async function inviteManager() {
        await db.delete(`${guild.id}`); await db.delete(`${guild.id}`);
        return client.invites.delete(guild.id);
    };

    async function ownerLogs() {
        let embed = new EmbedBuilder().setColor("#ff0505").setTimestamp(guild.joinedTimestamp).setDescription(`**A guild have deleted iHorizon !**`)
            .addFields({ name: "🏷️・Server Name", value: `\`${guild.name}\``, inline: true },
                { name: "🆔・Server ID", value: `\`${guild.id}\``, inline: true },
                { name: "🌐・Server Region", value: `\`${guild.preferredLocale}\``, inline: true },
                { name: "👤・MemberCount", value: `\`${guild.memberCount}\` members`, inline: true },
                { name: "🪝・Vanity URL", value: `\`discord.gg/${guild.vanityURLCode || "None"}\``, inline: true })
            .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`)
            .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) });

        return client.channels.cache.get(config.core.guildLogsChannelID).send({ embeds: [embed] }).catch(() => { });
    };

    await inviteManager(), ownerLogs();
};
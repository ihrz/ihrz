const { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, oldState, newState) => {
    async function serverLogs() {
        if (!oldState) return;
        if (!oldState.guild) return;

        const guildId = oldState.guild.id;
        const someinfo = await db.get(`${guildId}.GUILD.SERVER_LOGS.voice`);
        if (!someinfo) return;

        var Ouser = oldState.id
        var OchannelID = oldState.channelId
        var Ostatus = { selfDeaf: oldState.selfDeaf, selfMute: oldState.selfMute };

        var user = newState.id
        var channelID = newState.channelId
        var status = { selfDeaf: newState.selfDeaf, selfMute: newState.selfMute };

        let targetUser = await client.users.fetch(user);
        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: targetUser.username, iconURL: targetUser.avatarURL({ format: 'png', dynamic: true, size: 512 }) })
            .setTimestamp();

        // JOIN/LEAVE
        if (user && !channelID) {
            logsEmbed.setDescription(`📤 <@${targetUser.id}> quitte le salon <#${OchannelID}>`);
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
        if (Ouser && !OchannelID) {
            logsEmbed.setDescription(`📥 <@${targetUser.id}> se connecte au salon <#${channelID}>`);
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        };
        // MUTE CASQUE
        if (!Ostatus.selfDeaf && status.selfDeaf) {
            logsEmbed.setDescription(`<@${targetUser.id}> s'est mute casque dans le salon <#${channelID}>`);
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
        if (Ostatus.selfDeaf && !status.selfDeaf) {
            logsEmbed.setDescription(`<@${targetUser.id}> s'est demute casque casque dans le salon <#${channelID}>`);
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
        
        // MUTE MICRO
        if (!Ostatus.selfMute && status.selfMute) {
            logsEmbed.setDescription(`<@${targetUser.id}> s'est mute dans le salon <#${channelID}>`);
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
        if (Ostatus.selfMute && !status.selfMute) {
            logsEmbed.setDescription(`<@${targetUser.id}> s'est demute casque dans le salon <#${channelID}>`);
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
    };

    await serverLogs();
};
const { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = async (client, oldState, newState) => {
    let data = await getLanguageData(oldState.guild.id);
    async function serverLogs() {
        if (!oldState || !oldState.guild) return;
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
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${OchannelID}", OchannelID)
            );
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
        if (Ouser && !OchannelID) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_2_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        };
        // MUTE CASQUE
        if (!Ostatus.selfDeaf && status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_3_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
        if (Ostatus.selfDeaf && !status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_4_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }

        // MUTE MICRO
        if (!Ostatus.selfMute && status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_5_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
        if (Ostatus.selfMute && !status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_6_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
        }
    };

    await serverLogs();
};
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

const { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client } = require('discord.js');

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);


module.exports = async (client, oldState, newState) => {
    let data = await getLanguageData(oldState.guild.id);
    async function serverLogs() {
        if (!oldState || !oldState.guild) return;
        const guildId = oldState.guild.id;
        // const someinfo = await db.get(`${guildId}.GUILD.SERVER_LOGS.voice`);
        const someinfo = await DataBaseModel({id: DataBaseModel.Get, key: `${guildId}.GUILD.SERVER_LOGS.voice`});
        if (!someinfo) return;

        let Msgchannel = client.channels.cache.get(someinfo);
        if (!Msgchannel) return;

        var Ouser = oldState.id
        var OchannelID = oldState.channelId
        var Ostatus = { selfDeaf: oldState.selfDeaf, selfMute: oldState.selfMute };

        var user = newState.id
        var channelID = newState.channelId
        var status = { selfDeaf: newState.selfDeaf, selfMute: newState.selfMute };

        let targetUser = await client.users.fetch(user);

        if(targetUser.id === client.user.id) return;
        
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
            return await Msgchannel.send({ embeds: [logsEmbed] });
        }
        if (Ouser && !OchannelID) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_2_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await Msgchannel.send({ embeds: [logsEmbed] });
        };
        // MUTE CASQUE
        if (!Ostatus.selfDeaf && status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_3_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await Msgchannel.send({ embeds: [logsEmbed] });
        }
        if (Ostatus.selfDeaf && !status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_4_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await Msgchannel.send({ embeds: [logsEmbed] });
        }

        // MUTE MICRO
        if (!Ostatus.selfMute && status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_5_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await Msgchannel.send({ embeds: [logsEmbed] });
        }
        if (Ostatus.selfMute && !status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_6_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            return await Msgchannel.send({ embeds: [logsEmbed] });
        }
    };

    await serverLogs();
};
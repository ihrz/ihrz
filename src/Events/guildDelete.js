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

const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require(`${process.cwd()}/files/config.js`),
    DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`),
    logger = require(`${process.cwd()}/src/core/logger`);

module.exports = async (client, guild) => {
    async function inviteManager() {
        await DataBaseModel({ id: DataBaseModel.Delete, key: `${guild.id}` })
        return client.invites.delete(guild.id);
    };

    async function ownerLogs() {
        try {
            if (guild.vanityURLCode) i = 'discord.gg/' + guild.vanityURLCode;
            let embed = new EmbedBuilder().setColor("#ff0505").setTimestamp(guild.joinedTimestamp).setDescription(`**A guild have deleted iHorizon !**`)
                .addFields({ name: "🏷️・Server Name", value: `\`${guild.name}\``, inline: true },
                    { name: "🆔・Server ID", value: `\`${guild.id}\``, inline: true },
                    { name: "🌐・Server Region", value: `\`${guild.preferredLocale}\``, inline: true },
                    { name: "👤・MemberCount", value: `\`${guild.memberCount}\` members`, inline: true },
                    { name: "🪝・Vanity URL", value: `\`${i || 'None'}\``, inline: true })
                .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`)
                .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) });

            let channel = client.channels.cache.get(config.core.guildLogsChannelID);

            return channel.send({ embeds: [embed] });
        } catch (error) {
            logger.err(error);
        };
    };

    await ownerLogs(), inviteManager();
};
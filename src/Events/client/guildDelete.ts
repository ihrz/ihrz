/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { BaseGuildTextChannel, Client, Guild, EmbedBuilder } from 'discord.js';

import logger from "../../core/logger.js";

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "guildDelete",
    run: async (client: Client, guild: Guild) => {

        async function inviteManager() {
            await client.db.delete(`${guild.id}`);

            return client.invites.delete(guild.id);
        }

        async function ownerLogs() {
            try {
                let i: string = '';

                if (guild.name === undefined || null) {
                    return;
                }

                if (guild.vanityURLCode) { i = 'discord.gg/' + guild.vanityURLCode; }

                let embed = new EmbedBuilder()
                    .setColor("#ff0505")
                    .setTimestamp(guild.joinedTimestamp)
                    .setDescription(`**A guild removed iHorizon !**`)
                    .addFields({ name: "🏷️・Server Name", value: `\`${guild.name}\``, inline: true },
                        { name: "🆔・Server ID", value: `\`${guild.id}\``, inline: true },
                        { name: "🌐・Server Region", value: `\`${guild.preferredLocale}\``, inline: true },
                        { name: "👤・MemberCount", value: `\`${guild.memberCount}\` members`, inline: true },
                        { name: "🪝・Vanity URL", value: `\`${i || 'None'}\``, inline: true },
                        { name: "🍻 new guilds total", value: client.guilds.cache.size.toString(), inline: true }
                    )
                    .setThumbnail(guild.iconURL())
                    .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

                let channel = client.channels.cache.get(client.config.core.guildLogsChannelID);

                return (channel as BaseGuildTextChannel).send({ embeds: [embed], files: [{ attachment: await client.functions.image64(client.user?.displayAvatarURL()), name: 'icon.png' }] });
            } catch (error: any) {
                logger.err(error);
            }
        }

        ownerLogs(), inviteManager();
    },
};
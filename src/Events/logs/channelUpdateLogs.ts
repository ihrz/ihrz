/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { AuditLogEvent, BaseGuildTextChannel, Client, EmbedBuilder, GuildChannel, Message } from 'discord.js';
import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

function getDiff(
    oldChannel: GuildChannel,
    newChannel: GuildChannel,
    lang: LanguageData
): string {
    let after = "";

    if (oldChannel.name !== newChannel.name) {
        after += `🎫 Nom: ${newChannel.name}\n`;
    }

    const oldPerms = oldChannel.permissionOverwrites.cache;
    const newPerms = newChannel.permissionOverwrites.cache;

    oldPerms.forEach((oldPerm, id) => {
        const newPerm = newPerms.get(id);

        if (newPerm) {
            const target = newPerm.type === 0 ? `<@&${id}>` : `<@${id}>`;

            const removedPerms = oldPerm.allow.toArray().filter(perm => !newPerm.allow.has(perm));
            removedPerms.forEach(perm => {
                after += `-    ❌ ${perm} désactivée pour ${target}\n`;
            });

            const addedPerms = newPerm.allow.toArray().filter(perm => !oldPerm.allow.has(perm));
            addedPerms.forEach(perm => {
                after += `-    ✅ ${perm} activée pour ${target}\n`;
            });

            const removedDeniedPerms = oldPerm.deny.toArray().filter(perm => !newPerm.deny.has(perm));
            removedDeniedPerms.forEach(perm => {
                after += `-    ✅ ${perm} autorisée pour ${target}\n`;
            });

            const addedDeniedPerms = newPerm.deny.toArray().filter(perm => !oldPerm.deny.has(perm));
            addedDeniedPerms.forEach(perm => {
                after += `-    ❌ ${perm} refusée pour ${target}\n`;
            });
        }
    });

    newPerms.forEach((newPerm, id) => {
        if (!oldPerms.has(id)) {
            const target = newPerm.type === 0 ? `<@&${id}>` : `<@${id}>`;
            after += `🛡 Permissions ajoutées pour ${target}:\n`;
            newPerm.allow.toArray().forEach(perm => {
                after += `-    ✅ ${perm}\n`;
            });
            newPerm.deny.toArray().forEach(perm => {
                after += `-    ❌ ${perm}\n`;
            });
        }
    });

    return after;
}

export const event: BotEvent = {
    name: "channelUpdate",
    run: async (client: Client, oldChannel: GuildChannel, newChannel: GuildChannel) => {

        let lang = await client.func.getLanguageData(oldChannel.guildId) as LanguageData;

        if (!oldChannel || !oldChannel?.guild) return;

        let fetchedLogs = await newChannel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelUpdate,
            limit: 1,
        });

        if (oldChannel.position !== newChannel.position) return;

        var firstEntry = fetchedLogs.entries.first();

        let someinfo = await client.db.get(`${oldChannel.guildId}.GUILD.SERVER_LOGS.channel`);

        let Msgchannel = oldChannel.guild.channels.cache.get("1287779711082168410");
        if (!Msgchannel) return;

        let icon = firstEntry?.executor?.displayAvatarURL();

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: firstEntry?.executor?.username || lang.var_unknown, iconURL: icon })
            .setDescription(`${newChannel.toString()} are updated`)

        const changes = getDiff(oldChannel, newChannel, lang);

        logsEmbed.setFields(
            { name: lang.event_srvLogs_messageUpdate_footer_2, value: changes },
        );

        logsEmbed.setTimestamp();

        await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
    },
};

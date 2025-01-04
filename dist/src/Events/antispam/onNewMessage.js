/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/
import { PermissionFlagsBits, Collection, EmbedBuilder } from 'discord.js';
export const cache = {
    raidInfo: new Map(),
    messages: new Map(),
    membersToPunish: new Map(),
    membersFlags: new Map()
};
let timeout = null;
async function waitForFinish() {
    return new Promise((resolve) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => {
            resolve();
        }, 5000);
    });
}
async function logsAction(lang, message, users, sanctionType) {
    if (users.size === 0)
        return;
    const firstUser = users.values().next().value;
    const inDb = await message.client.db.get(`${message.guildId}.GUILD.SERVER_LOGS.antispam`);
    if (!inDb)
        return;
    const channel = firstUser?.guild.channels.cache.get(inDb);
    if (!channel)
        return;
    let embed = new EmbedBuilder()
        .setColor("#e4433f")
        .setTimestamp()
        .setTitle(lang.antispam_log_embed_title.replace('${actionType}', sanctionType))
        .setDescription(lang.antispam_log_embed_desc
        .replace("${client.user?.toString()}", message.client.user?.toString())
        .replace("${actionType}", 'sanction')
        .replace("${user.toString()}", Array.from(users).map(x => x.toString()).join(',')));
    await channel.send({ embeds: [embed] });
    return;
}
async function sendWarningMessage(lang, members, channel, options) {
    const membersToWarn = [...members];
    if (membersToWarn.length === 0) {
        return;
    }
    const mentionedMembers = membersToWarn.map(member => member.toString()).join(', ');
    let warningMessage = lang.antispam_base_warn_message.replace("${mentionedMembers}", mentionedMembers);
    switch (options.punishment_type) {
        case 'mute':
            warningMessage += lang.antispam_more_mute_msg;
            break;
        case 'kick':
            warningMessage += lang.antispam_more_kick_msg;
            break;
        case 'ban':
            warningMessage += lang.antispam_more_ban_msg;
            break;
    }
    channel?.send(warningMessage).then((msg) => {
        setTimeout(() => msg.delete(), 4000);
    });
}
async function clearSpamMessages(message, messages) {
    try {
        const CHUNK_SIZE = 15;
        const messagesByChannel = new Collection();
        messages.forEach(cachedMessage => {
            if (cachedMessage.isSpam) {
                const channelMessages = messagesByChannel.get(cachedMessage.channelID) || new Collection();
                channelMessages.set(cachedMessage.messageID, cachedMessage.messageID);
                messagesByChannel.set(cachedMessage.channelID, channelMessages);
            }
        });
        await Promise.all(messagesByChannel.map(async (messageIds, channelId) => {
            const channel = message.guild?.channels.cache.get(channelId);
            if (channel && messageIds.size > 0) {
                const messageIdsArray = Array.from(messageIds.values());
                for (let i = 0; i < messageIdsArray.length; i += CHUNK_SIZE) {
                    const chunk = messageIdsArray.slice(i, i + CHUNK_SIZE);
                    try {
                        await channel.bulkDelete(chunk, true);
                        chunk.forEach(messageId => {
                            messages.forEach(message => {
                                if (message.messageID === messageId) {
                                    cache.messages.get(message.guildID)?.delete(message);
                                }
                            });
                        });
                    }
                    catch { }
                }
            }
        }));
    }
    catch (error) {
    }
}
async function PunishUsers(guildId, members, options) {
    const membersCleaned = [...new Set(members)];
    const punishPromises = membersCleaned.map(async (member) => {
        let time = options.punishTime;
        switch (options.punishment_type) {
            case 'mute':
                const userCanBeMuted = member.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers) &&
                    member.guild.members.me.roles.highest.position > member.roles.highest.position &&
                    member.id !== member.guild.ownerId;
                if (userCanBeMuted) {
                    await member.timeout(time, 'Spamming');
                    await member.client.method.warnMember(member.guild?.members.me, member, "Antispam Punishment").catch(() => { });
                }
                break;
            case 'ban':
                const userCanBeBanned = options.Enabled && member.bannable;
                if (userCanBeBanned) {
                    await member.ban({ reason: 'Spamming!' }).catch(() => { });
                }
                break;
            case 'kick':
                const userCanBeKicked = options.Enabled && member.kickable;
                if (userCanBeKicked) {
                    await member.kick('Spamming!').catch(() => { });
                }
                break;
        }
        cache.membersFlags.get(guildId)?.delete(`${member.id}`);
    });
    await Promise.all(punishPromises);
}
export const event = {
    name: 'messageCreate',
    run: async (client, message) => {
        let options = await client.db.get(`${message.guildId}.GUILD.ANTISPAM`);
        if (!options)
            return;
        let cancelAnalyze = false;
        // Check if the member have roles to bypass antispam
        for (let role in options.BYPASS_ROLES) {
            if (message.member?.roles.cache.has(options.BYPASS_ROLES[parseInt(role)])) {
                cancelAnalyze = true;
            }
        }
        ;
        // Basic checks (if is in guild, if the antispam are configured etc)
        if (!message.guild ||
            message.author.id === message.client.user.id ||
            !options.Enabled ||
            message.guild.ownerId === message.author.id ||
            message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
            (options.ignoreBots && message.author.bot) ||
            cancelAnalyze ||
            options.BYPASS_CHANNELS?.includes(message.channelId)) {
            return false;
        }
        let lang = await client.func.getLanguageData(message.guild.id);
        let currentMessage = {
            messageID: message.id,
            guildID: message.guild.id,
            authorID: message.author.id,
            channelID: message.channel.id,
            content: message.content,
            sentTimestamp: message.createdTimestamp,
            isSpam: false
        };
        // Init all cache if doesn't exist
        if (!cache.messages.has(message.guild.id)) {
            cache.messages.set(message.guild.id, new Set());
        }
        if (!cache.membersToPunish.has(message.guild.id)) {
            cache.membersToPunish.set(message.guild.id, new Set());
        }
        if (!cache.raidInfo.has(message.guild.id)) {
            cache.raidInfo.set(message.guild.id, new Map());
        }
        if (!cache.membersFlags.has(message.guild.id)) {
            cache.membersFlags.set(message.guild.id, new Map());
        }
        // Init User cache
        if (!cache.membersFlags.get(message.guild.id).get(`${message.author.id}`)) {
            cache.membersFlags.get(message.guild.id).set(`${message.author.id}`, 0);
        }
        // Load cache message
        const guildCacheMessages = cache.messages.get(message.guild.id);
        const previousMessages = Array.from(guildCacheMessages);
        // Add current message in cache
        guildCacheMessages.add(currentMessage);
        let memberTotalWarn = cache.membersFlags.get(message.guild.id).get(message.author.id);
        const lastMessage = previousMessages.filter(x => x.authorID === message.author.id).slice(-1)[0];
        const elapsedTime = lastMessage ? currentMessage.sentTimestamp - lastMessage.sentTimestamp : options.maxInterval - 100;
        // Basic checks
        if (elapsedTime && elapsedTime < options.maxInterval) {
            cache.membersFlags.get(message.guild.id).set(`${message.author.id}`, memberTotalWarn + 1);
            currentMessage.isSpam = true;
        }
        if (cache.membersFlags.get(message.guild.id).get(`${message.author.id}`) >= options.Threshold) {
            cache.membersToPunish.get(message.guild.id).add(message.member);
            currentMessage.isSpam = true;
        }
        ;
        // if the member break the threshold
        if (cache.membersToPunish.get(message.guild.id).size >= 1 && cache.membersFlags.get(message.guild.id).get(`${message.author.id}`) >= options.Threshold) {
            currentMessage.isSpam = true;
            let membersToPunish = cache.membersToPunish.get(message.guild.id);
            let guildRaidInfo = cache.raidInfo.get(message.guild.id);
            if (!guildRaidInfo?.has(`${message.author.id}.timeout`)) {
                guildRaidInfo?.set(`${message.author.id}.timeout`, 0);
            }
            const timeout = guildRaidInfo?.get(`${message.author.id}.timeout`);
            const currentTime = Date.now();
            if (timeout < currentTime) {
                guildRaidInfo?.set(`${message.author.id}.timeout`, currentTime + 5000);
            }
            if (timeout < currentTime) {
                await waitForFinish();
                await PunishUsers(message.guild.id, membersToPunish, options);
                await clearSpamMessages(message, cache.messages.get(message.guild.id));
                await sendWarningMessage(lang, membersToPunish, message.channel, options);
                await logsAction(lang, message, membersToPunish, options.punishment_type);
                membersToPunish?.clear();
            }
        }
    },
};

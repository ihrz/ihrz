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

import {
    Client,
    Message,
    GuildMember,
    PermissionFlagsBits,
    BaseGuildTextChannel,
    Collection,
    Snowflake,
    EmbedBuilder
} from 'discord.js';

import { DatabaseStructure } from '../../core/database_structure';

import { AntiSpam } from '../../../types/antispam';
import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const cache: AntiSpam.AntiSpamCache = {
    raidInfo: new Map<string, { value: number | boolean }>(),
    messages: new Set(),
    kickedUsers: new Set(),
    bannedUsers: new Set(),
    spamMessagesToClear: new Set<AntiSpam.CachedMessage>(),
    membersToPunish: new Set(),
};


async function waitForFinish(lastMessage?: AntiSpam.CachedMessage): Promise<void> {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const lastMessageTime = (lastMessage?.sentTimestamp) || Date.now();
            if ((Date.now() - lastMessageTime) > 5000) {
                clearInterval(interval);
                resolve();
            }
        }, 500);
    });
}
function levenshtein(a: string, b: string): number {
    const distanceMatrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        distanceMatrix[i] = [];
        distanceMatrix[i][0] = i;
    }

    for (let j = 0; j <= a.length; j++) {
        distanceMatrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const indicator = a[j - 1] === b[i - 1] ? 0 : 1;
            distanceMatrix[i][j] = Math.min(
                distanceMatrix[i - 1][j] + 1,
                distanceMatrix[i][j - 1] + 1,
                distanceMatrix[i - 1][j - 1] + indicator
            );
        }
    }

    return distanceMatrix[b.length][a.length];
}

async function logsAction(lang: LanguageData, client: Client, user: GuildMember, actionType: 'sanction' | 'warn', sanctionType?: 'mute' | 'kick' | 'ban') {
    let inDb = await client.db.get(`${user.guild.id}.GUILD.SERVER_LOGS.antispam`) as string | null;

    if (!inDb) return;

    let channel = user.guild.channels.cache.get(inDb);
    if (!channel) return;

    let embed = new EmbedBuilder()
        .setColor(actionType === 'sanction' ? "#e4433f" : "#ff992e")
        .setTimestamp()
        .setTitle(lang.antispam_log_embed_title.replace('${actionType}', actionType))
        .setDescription(lang.antispam_log_embed_desc
            .replace("${client.user?.toString()}", client.user?.toString()!)
            .replace("${actionType}", String(actionType === 'sanction' ? sanctionType : 'warn'))
            .replace("${user.toString()}", user.toString())
        )

    await (channel as BaseGuildTextChannel).send({ embeds: [embed] });
    return;
}

async function sendWarningMessage(
    lang: LanguageData,
    members: Set<GuildMember>,
    channel: BaseGuildTextChannel | null,
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const membersToWarn = [...members].filter(member => !cache.raidInfo.get(`${channel?.guildId}_${member.id}.warned`)?.value === true);

    for (const member of membersToWarn) {
        cache.raidInfo.set(`${channel?.guildId}_${member.id}.warned`, { value: true });
        let amountOfWarn = cache.raidInfo.get(`${channel?.guildId}_${member.id}.amount`)?.value as number;
        cache.raidInfo.set(`${channel?.guildId}_${member.id}.amount`, { value: amountOfWarn + 1 });
    }

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

    if (channel) {
        await channel.send(warningMessage).then((msg) => {
            setTimeout(() => msg.delete(), 4000);
        });
    } else {
        for (const member of membersToWarn) {
            await member.send(warningMessage);
        }
    }

    setTimeout(() => {
        for (const member of membersToWarn) {
            cache.raidInfo.set(`${channel?.guildId}_${member.id}.warned`, { value: false });
        }
    }, options.intervalBetweenWarn);
}

async function clearSpamMessages(messages: Set<AntiSpam.CachedMessage>, client: Client): Promise<void> {
    try {
        const CHUNK_SIZE = 50;
        const messagesByChannel: Collection<Snowflake, Collection<string, Snowflake>> = new Collection();

        const messageChunks = [];
        const messagesArray = Array.from(messages);
        for (let i = 0; i < messagesArray.length; i += CHUNK_SIZE) {
            messageChunks.push(messagesArray.slice(i, i + CHUNK_SIZE));
        }

        await Promise.all(messageChunks.map(async (chunk) => {
            for (const cachedMessage of chunk) {
                const channelMessages = messagesByChannel.get(cachedMessage.channelID) || new Collection<string, Snowflake>();
                channelMessages.set(cachedMessage.messageID, cachedMessage.messageID);
                messagesByChannel.set(cachedMessage.channelID, channelMessages);
            }

            return Promise.all(Array.from(messagesByChannel).map(async ([channelId, messageIds]) => {
                const channel = client.channels.cache.get(channelId) as BaseGuildTextChannel | undefined;
                if (channel && messageIds.size > 0) {
                    try {
                        await channel.bulkDelete(Array.from(messageIds.values()), true).then(() => {
                            messages.forEach(message => {
                                cache.messages.delete(message);
                                cache.spamMessagesToClear.delete(message);
                            });
                        });
                    } catch {
                    }
                }
            }));
        }));

    } catch {
    }
}

async function PunishUsers(
    lang: LanguageData,
    members: Set<GuildMember>,
    client: Client,
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const membersCleaned = [...new Set(members)];

    const punishPromises = membersCleaned.map(async (member) => {

        cache.raidInfo.set(`${member?.guild.id}_${member.id}.warned`, { value: true });
        let amountOfWarn = cache.raidInfo.get(`${member?.guild.id}_${member.id}.amount`)?.value as number;
        cache.raidInfo.set(`${member?.guild.id}_${member.id}.amount`, { value: amountOfWarn + 1 });

        let time = options.punishTime;
        if (options.punishTimeMultiplier) {
            time = options.punishTime * (cache.raidInfo.get(`${member.guild.id}.${member.id}.amount`)?.value as number || 1);
        }

        switch (options.punishment_type) {
            case 'mute':
                const userCanBeMuted =
                    member.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers) &&
                    member.guild.members.me.roles.highest.position > member.roles.highest.position &&
                    member.id !== member.guild.ownerId;

                if (userCanBeMuted) {
                    await member.timeout(time, 'Spamming');
                }
                break;
            case 'ban':
                const userCanBeBanned =
                    options.Enabled && !cache.bannedUsers.has(member.id) && member.bannable;

                if (userCanBeBanned) {
                    cache.bannedUsers.add(member.id);
                    await member.ban({ reason: 'Spamming!' }).catch(() => { });
                }
                break;
            case 'kick':
                const userCanBeKicked =
                    options.Enabled && !cache.kickedUsers.has(member.id) && member.kickable;

                if (userCanBeKicked) {
                    cache.kickedUsers.add(member.id);
                    await member.kick('Spamming!').catch(() => { });
                }
                break;
        }
        cache.membersToPunish.delete(member);

        // await logsAction(lang, client, member, "sanction", options.punishment_type);
    });

    await Promise.all(punishPromises);
}

export const event: BotEvent = {
    name: 'messageCreate',
    run: async (client: Client, message: Message) => {
        let options = await client.db.get(`${message.guildId}.GUILD.ANTISPAM`) as DatabaseStructure.DbGuildObject['ANTISPAM'];

        if (!options) return;

        let cancelAnalyze = false;
        for (let role in options.BYPASS_ROLES) {
            if (message.member?.roles.cache.has(role)) {
                cancelAnalyze = true;
            }
        };

        if (
            !message.guild ||
            message.author.id === message.client.user.id ||
            !options.Enabled ||
            message.guild.ownerId === message.author.id ||
            message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
            (options.ignoreBots && message.author.bot) ||
            cancelAnalyze
        ) {
            return false;
        }

        let lang = await client.functions.getLanguageData(message.guild.id) as LanguageData;

        let currentMessage: AntiSpam.CachedMessage = {
            messageID: message.id,
            guildID: message.guild.id,
            authorID: message.author.id,
            channelID: message.channel.id,
            content: message.content,
            sentTimestamp: message.createdTimestamp,
        };

        cache.messages.add(currentMessage);

        const cacheMessages = Array.from(cache.messages).filter(
            (m) => m.guildID === message.guild?.id
        );

        const duplicateMessages = cacheMessages.filter(
            (m) =>
                m.content === message.content &&
                m.sentTimestamp > currentMessage.sentTimestamp - options.maxDuplicatesInterval
        );

        const spamOtherDuplicates: AntiSpam.CachedMessage[] = [];

        if (duplicateMessages.length > 0) {
            let rowBroken = false;
            cacheMessages
                .sort((a, b) => b.sentTimestamp - a.sentTimestamp)
                .forEach((element) => {
                    if (rowBroken) return;
                    if (element.content !== duplicateMessages[0].content) rowBroken = true;
                    else spamOtherDuplicates.push(element);
                });
        }

        if (!cache.raidInfo.get(`${message.guildId}.${message.author.id}.amount`)?.value) {
            cache.raidInfo.set(`${message.guildId}.${message.author.id}.amount`, { value: 0 })
        }

        const spamMatches = cacheMessages.filter(
            (m) => m.sentTimestamp > Date.now() - options.maxInterval
        );

        const similarMessages = cacheMessages.length >= 2 ? cacheMessages.filter(
            (m) => levenshtein(m.content.toLowerCase(), currentMessage.content.toLowerCase()) <= 3
        ) : null

        const lastMessage = cacheMessages.length > 1 ? cacheMessages[1] : null;
        const elapsedTime = lastMessage ? currentMessage.sentTimestamp - lastMessage.sentTimestamp : null;

        if (duplicateMessages.length >= options.maxDuplicates) {
            cache.membersToPunish = cache.membersToPunish.add(message.member!);
            duplicateMessages.forEach(msg => cache.spamMessagesToClear.add(msg));
            spamOtherDuplicates.forEach(msg => cache.spamMessagesToClear.add(msg));
        }

        if (elapsedTime && elapsedTime < options.maxInterval) {
            cache.membersToPunish = cache.membersToPunish.add(message.member!);
            cacheMessages.forEach(msg => cache.spamMessagesToClear.add(msg));
            duplicateMessages.forEach(msg => cache.spamMessagesToClear.add(msg));
            spamMatches.forEach(msg => cache.spamMessagesToClear.add(msg));
            spamOtherDuplicates.forEach(msg => cache.spamMessagesToClear.add(msg));
            cache.spamMessagesToClear.add(currentMessage);
        }

        if (similarMessages && similarMessages.length! >= options.similarMessageThreshold) {
            cache.membersToPunish = cache.membersToPunish.add(message.member!);
            similarMessages.forEach(msg => cache.spamMessagesToClear.add(msg));
            spamOtherDuplicates.forEach(msg => cache.spamMessagesToClear.add(msg));
        }

        await waitForFinish(lastMessage!);

        await PunishUsers(lang, cache.membersToPunish, client, options)
        await sendWarningMessage(lang, cache.membersToPunish, message.channel as BaseGuildTextChannel, options)

        if (options.removeMessages && cache.spamMessagesToClear.size > 0) {
            await clearSpamMessages(cache.spamMessagesToClear, client);
        }
    },
};
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
import logger from '../../core/logger.js';

import { AntiSpam } from '../../../types/antispam';
import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const cache: AntiSpam.AntiSpamCache = {
    warnInfo: new Map<string, { value: number | boolean }>(),
    messages: new Set(),
    kickedUsers: new Set(),
    bannedUsers: new Set(),
    spamMessagesToClear: [],
    membersToPunish: new Set(),
};

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
};

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
    const membersToWarn = [...members].filter(member => !cache.warnInfo.get(`${channel?.guildId}_${member.id}.warned`)?.value === true);

    for (const member of membersToWarn) {
        cache.warnInfo.set(`${channel?.guildId}_${member.id}.warned`, { value: true });
        let amountOfWarn = cache.warnInfo.get(`${channel?.guildId}_${member.id}.amount`)?.value as number;
        cache.warnInfo.set(`${channel?.guildId}_${member.id}.amount`, { value: amountOfWarn + 1 });
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
            cache.warnInfo.set(`${channel?.guildId}_${member.id}.warned`, { value: false });
        }
    }, options.intervalBetweenWarn);
}

async function clearSpamMessages(messages: AntiSpam.CachedMessage[], client: Client): Promise<void> {
    try {
        const CHUNK_SIZE = 50;
        const messagesByChannel: Collection<Snowflake, Collection<string, Snowflake>> = new Collection();

        const messageChunks = [];
        for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
            messageChunks.push(messages.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of messageChunks) {
            for (const cachedMessage of chunk) {
                const channelMessages = messagesByChannel.get(cachedMessage.channelID) || new Collection<string, Snowflake>();
                channelMessages.set(cachedMessage.messageID, cachedMessage.messageID);
                messagesByChannel.set(cachedMessage.channelID, channelMessages);
            }

            for (const [channelId, messageIds] of messagesByChannel) {
                const channel = client.channels.cache.get(channelId) as BaseGuildTextChannel | undefined;
                if (channel && messageIds.size > 0) {
                    try {
                        await channel.bulkDelete(Array.from(messageIds.values()), true);
                    } catch { }
                }
            }

            messagesByChannel.clear();
        }
    } catch { }
}

async function PunishUsers(
    lang: LanguageData,
    members: Set<GuildMember>,
    client: Client,
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const membersCleaned = [...new Set(members)];

    const punishPromises = membersCleaned.map(async (member) => {
        let time = options.punishTime;
        if (options.punishTimeMultiplier) {
            time = options.punishTime * (cache.warnInfo.get(`${member.guild.id}.${member.id}.amount`)?.value as number || 1);
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

        await logsAction(lang, client, member, "sanction", options.punishment_type);
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

        if (!cache.warnInfo.get(`${message.guildId}.${message.author.id}.amount`)?.value) {
            cache.warnInfo.set(`${message.guildId}.${message.author.id}.amount`, { value: 0 })
        }

        const spamMatches = cacheMessages.filter(
            (m) => m.sentTimestamp > Date.now() - options.maxInterval
        );

        const similarMessages = cacheMessages.length >= 2 ? cacheMessages.filter(
            (m) => levenshtein(m.content.toLowerCase(), currentMessage.content.toLowerCase()) <= 3
        ) : null

        const lastMessage = cacheMessages.length > 1 ? cacheMessages[1] : null;
        const elapsedTime = lastMessage ? currentMessage.sentTimestamp - lastMessage.sentTimestamp : null;

        const membersToWarn: Set<GuildMember> = new Set();

        if (elapsedTime && elapsedTime < options.maxInterval && !cache.warnInfo.get(`${message.guild.id}.${message.author.id}.warned`)?.value) {
            for (const cachedMsg of spamMatches) {
                const member = message.guild.members.cache.get(cachedMsg.authorID);
                if (member && !cache.warnInfo.get(`${message.guild.id}.${message.author.id}.warned`)?.value) {
                    membersToWarn.add(member);
                }
            }

            if (membersToWarn.size > 0) {
                await sendWarningMessage(lang, membersToWarn, message.channel as BaseGuildTextChannel, options);
                return;
            }
        }

        if (duplicateMessages.length >= options.maxDuplicates) {
            cache.membersToPunish = cache.membersToPunish.add(message.member!);
            cache.spamMessagesToClear.push(...duplicateMessages, ...spamOtherDuplicates);
        }

        if (elapsedTime && elapsedTime < options.maxInterval && cache.warnInfo.get(`${message.guild.id}.${message.author.id}.warned`)?.value) {
            cache.membersToPunish = cache.membersToPunish.add(message.member!);
            cache.spamMessagesToClear.push(...cacheMessages, ...duplicateMessages, ...spamMatches, ...spamOtherDuplicates, currentMessage);
        }

        if (similarMessages && similarMessages.length! >= options.similarMessageThreshold) {
            cache.membersToPunish = cache.membersToPunish.add(message.member!);
            cache.spamMessagesToClear.push(...similarMessages, ...spamOtherDuplicates);
        }

        async function waitForFinish() {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    const lastMessageTime = (lastMessage?.sentTimestamp) || Date.now();
                    if ((Date.now() - lastMessageTime) > 5000) {
                        clearInterval(interval);
                        resolve(true);
                    }
                }, 500);
            });
        };

        waitForFinish().then(async () => {
            await PunishUsers(lang, cache.membersToPunish, client, options);

            if (cache.membersToPunish.size === 0 && options.removeMessages) {
                await clearSpamMessages(Array.from(cache.spamMessagesToClear), client);
            }
        })
    },
};
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

import {
    Client,
    Message,
    GuildMember,
    PermissionFlagsBits,
    BaseGuildTextChannel,
    Collection,
    Snowflake,
    EmbedBuilder
} from 'pwss';

import { DatabaseStructure } from '../../core/database_structure';

import { AntiSpam } from '../../../types/antispam';
import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const cache: AntiSpam.AntiSpamCache = {
    raidInfo: new Map<string, Map<string, { value: number | boolean; }>>(),
    messages: new Map<string, Set<AntiSpam.CachedMessage>>(),
    spamMessagesToClear: new Map<string, Set<AntiSpam.CachedMessage>>(),
    membersToPunish: new Map<string, Set<GuildMember>>(),
    membersFlags: new Map<string, Map<string, { value: number; }>>()
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

async function logsAction(lang: LanguageData, client: Client, guildId: string, users: Set<GuildMember>, actionType: 'sanction' | 'warn', sanctionType?: 'mute' | 'kick' | 'ban') {
    if (users.size === 0) return;

    const firstUser = users.values().next().value;
    const inDb = await client.db.get(`${guildId}.GUILD.SERVER_LOGS.antispam`) as string | null;

    if (!inDb) return;

    const channel = firstUser.guild.channels.cache.get(inDb);
    if (!channel) return;

    let embed = new EmbedBuilder()
        .setColor(actionType === 'sanction' ? "#e4433f" : "#ff992e")
        .setTimestamp()
        .setTitle(lang.antispam_log_embed_title.replace('${actionType}', actionType))
        .setDescription(lang.antispam_log_embed_desc
            .replace("${client.user?.toString()}", client.user?.toString()!)
            .replace("${actionType}", String(actionType === 'sanction' ? sanctionType : 'warn'))
            .replace("${user.toString()}", Array.from(users).map(x => x.toString()).join(','))
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
    const membersToWarn = [...members];

    for (const member of membersToWarn) {
        let amountOfWarn = cache.raidInfo.get(channel?.guildId!)?.get(`${member.id}.amount`)?.value as number;
        cache.raidInfo.get(channel?.guildId!)?.set(`${member.id}.amount`, { value: amountOfWarn + 1 });
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
}

async function clearSpamMessages(guildId: string, messages: Set<AntiSpam.CachedMessage>, client: Client): Promise<void> {
    try {
        const CHUNK_SIZE = 50;
        const messagesByChannel: Collection<Snowflake, Collection<string, Snowflake>> = new Collection();

        const messageChunks = [];
        const messagesArray = Array.from(messages).filter(m => m.isSpam);
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
                                cache.messages.get(guildId)?.delete(message);
                                cache.spamMessagesToClear.get(guildId)?.delete(message);
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
    guildId: string,
    members: Set<GuildMember>,
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const membersCleaned = [...new Set(members)];

    const punishPromises = membersCleaned.map(async (member) => {

        let amountOfWarn = cache.raidInfo.get(guildId)?.get(`${member.id}.amount`)?.value as number;
        cache.raidInfo.get(guildId)?.set(`${member.id}.amount`, { value: amountOfWarn + 1 });

        let time = options.punishTime;
        if (options.punishTimeMultiplier) {
            time = options.punishTime * (cache.raidInfo.get(guildId)?.get(`${member.id}.amount`)?.value as number || 1);
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

export const event: BotEvent = {
    name: 'messageCreate',
    run: async (client: Client, message: Message) => {
        let options = await client.db.get(`${message.guildId}.GUILD.ANTISPAM`) as DatabaseStructure.DbGuildObject['ANTISPAM'];

        if (!options) return;

        let cancelAnalyze = false;
        for (let role in options.BYPASS_ROLES) {
            if (message.member?.roles.cache.has(options.BYPASS_ROLES[parseInt(role)])) {
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

        let lang = await client.func.getLanguageData(message.guild.id) as LanguageData;

        let currentMessage: AntiSpam.CachedMessage = {
            messageID: message.id,
            guildID: message.guild.id,
            authorID: message.author.id,
            channelID: message.channel.id,
            content: message.content,
            sentTimestamp: message.createdTimestamp,
            isSpam: false
        };

        if (!cache.messages.has(message.guild.id)) {
            cache.messages.set(message.guild.id, new Set());
        }
        if (!cache.spamMessagesToClear.has(message.guild.id)) {
            cache.spamMessagesToClear.set(message.guild.id, new Set());
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

        cache.messages.get(message.guild.id)!.add(currentMessage);

        const cacheMessages = Array.from(cache.messages.get(message.guild.id)!).filter(
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

        if (!cache.raidInfo.get(message.guild.id)!.get(`${message.author.id}.amount`)?.value) {
            cache.raidInfo.get(message.guild.id)!.set(`${message.author.id}.amount`, { value: 0 })
        }

        if (!cache.membersFlags.get(message.guild.id)!.get(`${message.author.id}`)?.value) {
            cache.membersFlags.get(message.guild.id)!.set(`${message.author.id}`, { value: 0 })
        }

        let memberTotalWarn = cache.membersFlags.get(message.guild.id)!.get(`${message.author.id}`)?.value!;

        const similarMessages = cacheMessages.length >= 2 ? cacheMessages.filter(
            (m) => levenshtein(m.content.toLowerCase(), currentMessage.content.toLowerCase()) <= 2
        ) : null

        const lastMessage = cacheMessages.length > 1 ? cacheMessages[1] : null;
        const elapsedTime = lastMessage ? currentMessage.sentTimestamp - lastMessage.sentTimestamp : null;

        if (duplicateMessages.length >= options.maxDuplicates) {
            cache.membersFlags.get(message.guild.id)!.set(`${message.author.id}`, { value: memberTotalWarn + 1 });
            currentMessage.isSpam = true;
            cache.spamMessagesToClear.get(message.guild.id)!.add(currentMessage);
        }

        if (elapsedTime && elapsedTime < options.maxInterval) {
            cache.membersFlags.get(message.guild.id)!.set(`${message.author.id}`, { value: memberTotalWarn + 1 });
            currentMessage.isSpam = true;
            cache.spamMessagesToClear.get(message.guild.id)!.add(currentMessage);
        }

        if (similarMessages && similarMessages.length! >= options.similarMessageThreshold) {
            cache.membersFlags.get(message.guild.id)!.set(`${message.author.id}`, { value: memberTotalWarn + 1 });
            currentMessage.isSpam = true;
            cache.spamMessagesToClear.get(message.guild.id)!.add(currentMessage);
        }

        if (cache.membersFlags.get(message.guild.id)!.get(`${message.author.id}`)?.value! >= options.Threshold) {
            cache.membersToPunish.get(message.guild.id)!.add(message.member!);
            currentMessage.isSpam = true;
            cache.spamMessagesToClear.get(message.guild.id)!.add(currentMessage);
        };

        if (cache.membersToPunish.get(message.guild.id)!.size >= 1 && cache.membersFlags.get(message.guild.id)!.get(`${message.author.id}`)?.value! >= options.Threshold) {
            await waitForFinish(lastMessage!);

            await PunishUsers(message.guild.id, cache.membersToPunish.get(message.guild.id)!, options)
            await sendWarningMessage(lang, cache.membersToPunish.get(message.guild.id)!, message.channel as BaseGuildTextChannel, options)

            if (options.removeMessages && cache.spamMessagesToClear.get(message.guild.id)!.size > 0) {
                await clearSpamMessages(message.guild.id, cache.spamMessagesToClear.get(message.guild.id)!, client);
            }

            await logsAction(lang, client, message.guild.id, cache.membersToPunish.get(message.guild.id)!, "sanction", options.punishment_type);

            cache.membersToPunish.get(message.guild.id)!.clear();
        }
    },
};
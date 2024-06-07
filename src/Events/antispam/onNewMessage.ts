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
    Guild,
    Embed,
    EmbedBuilder
} from 'discord.js';

import { DatabaseStructure } from '../../core/database_structure';
import logger from '../../core/logger.js';

import { AntiSpam } from '../../../types/antispam';
import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const cache: AntiSpam.AntiSpamCache = {
    messages: [],
    kickedUsers: [],
    bannedUsers: [],
    warnedUsersStatus: {},
    warnedAmount: {}
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

    console.log(inDb)
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
    members: GuildMember[],
    channel: BaseGuildTextChannel | null,
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const mentionedMembers = [...new Set(members.map(member => member.toString()))].join(', ');
    const membersCleaned = [... new Set(members)];

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
        for (const member of membersCleaned) {
            await member.send(warningMessage);
        }
    }

    for (const member of membersCleaned) {
        cache.warnedUsersStatus[member.id] = true;
        cache.warnedAmount[member.id]++

        await logsAction(lang, channel?.client!, member, "warn")
    }

    setTimeout(() => {
        for (const member of membersCleaned) {
            delete cache.warnedUsersStatus[member.id];
        }
    }, options.intervalBetweenWarn);
}

async function clearSpamMessages(messages: AntiSpam.CachedMessage[], client: Client): Promise<void> {
    try {
        const messagesByChannel: Collection<Snowflake, Collection<string, Message>> = new Collection();
        for (const cachedMessage of messages) {
            const channel = client.channels.cache.get(cachedMessage.channelID) as BaseGuildTextChannel | undefined;

            if (channel) {
                const message = channel.messages.cache.get(cachedMessage.messageID);
                if (message && message.deletable) {
                    if (!messagesByChannel.has(channel.id)) {
                        messagesByChannel.set(channel.id, new Collection());
                    }
                    messagesByChannel.get(channel.id)!.set(message.id, message);
                }
            }
        }

        for (const [channelId, messagesToDelete] of messagesByChannel) {
            const channel = client.channels.cache.get(channelId) as BaseGuildTextChannel | undefined;
            if (channel && messagesToDelete.size > 0) {
                await channel.bulkDelete(messagesToDelete, true);
                console.log('bulkDelete')
            }
        }
    } catch (error) {
        logger.err("Erreur lors de la suppression des messages de spam :" + error);
    }
}

async function PunishUsers(
    lang: LanguageData,
    members: GuildMember[],
    spamMessages: AntiSpam.CachedMessage[],
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const membersCleaned = [... new Set(members)];

    for (const member of membersCleaned) {
        cache.messages = cache.messages.filter(x => x.authorID !== member.id);

        let time = options.punishTime;
        if (options.punishTimeMultiplier) {
            time = options.punishTime * cache.warnedAmount[member.id]
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
                    options.Enabled && !cache.bannedUsers.includes(member.id) && member.bannable;

                if (userCanBeBanned) {
                    cache.bannedUsers.push(member.id);
                    await member.ban({ reason: 'Spamming!' }).catch(() => { });
                }
                break;
            case 'kick':
                const userCanBeKicked =
                    options.Enabled && !cache.kickedUsers.includes(member.id) && member.kickable;

                if (userCanBeKicked) {
                    cache.kickedUsers.push(member.id);
                    await member.kick('Spamming!').catch(() => { });
                }
                break;
        }

        await logsAction(lang, members[0].client, member, "sanction", options.punishment_type);
    }

    if (options.removeMessages && spamMessages) {
        await clearSpamMessages(spamMessages, members[0].client);
    }
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

        let lang = client.functions.getLanguageData(message.guild.id) as LanguageData;

        let currentMessage: AntiSpam.CachedMessage = {
            messageID: message.id,
            guildID: message.guild.id,
            authorID: message.author.id,
            channelID: message.channel.id,
            content: message.content,
            sentTimestamp: message.createdTimestamp,
        };

        cache.messages.push(currentMessage);

        const cachedMessages = cache.messages
        // .filter(
        //     (m) => m.authorID === message.author.id && m.guildID === message.guild?.id
        // );

        const duplicateMatches = cachedMessages.filter(
            (m) =>
                m.content === message.content &&
                m.sentTimestamp > currentMessage.sentTimestamp - options.maxDuplicatesInterval
        );

        const spamOtherDuplicates: AntiSpam.CachedMessage[] = [];

        if (duplicateMatches.length > 0) {
            let rowBroken = false;
            cachedMessages
                .sort((a, b) => b.sentTimestamp - a.sentTimestamp)
                .forEach((element) => {
                    if (rowBroken) return;
                    if (element.content !== duplicateMatches[0].content) rowBroken = true;
                    else spamOtherDuplicates.push(element);
                });
        }

        if (!cache.warnedAmount[message.author.id]) {
            cache.warnedAmount[message.author.id] = 0
        };

        const spamMatches = cachedMessages.filter(
            (m) => m.sentTimestamp > Date.now() - options.maxInterval
        );

        let sanctioned = false;

        const userCanBePunish = options.Enabled && !sanctioned;

        const similarMessages = cachedMessages.length >= 2 ? cachedMessages.filter(
            (m) => levenshtein(m.content.toLowerCase(), currentMessage.content.toLowerCase()) <= 3
        ) : null

        const lastMessage = cachedMessages.length > 1 ? cachedMessages[1] : null;

        const elapsedTime = lastMessage ? currentMessage.sentTimestamp - lastMessage.sentTimestamp : null;

        const membersToWarn: GuildMember[] = [];

        if (elapsedTime && elapsedTime < options.maxInterval && !cache.warnedUsersStatus[message.author.id]) {
            for (const cachedMsg of spamMatches) {
                const member = message.guild!.members.cache.get(cachedMsg.authorID);
                if (member && !cache.warnedUsersStatus[member.id]) {
                    membersToWarn.push(member);
                }
            }

            if (membersToWarn.length > 0) {
                await sendWarningMessage(lang, membersToWarn, message.channel as BaseGuildTextChannel | null, options);
                return;
            }
        }
        if (userCanBePunish && duplicateMatches.length >= options.maxDuplicates) {
            console.log('Envoie des message identique et vite -> punis 2');
            await PunishUsers(lang, [message.member!], [...duplicateMatches, ...spamOtherDuplicates], options);
            return sanctioned = true;
        }

        if (elapsedTime && elapsedTime < options.maxInterval && cache.warnedUsersStatus[message.author.id]) {
            console.log('Envoie des message trop vite -> punis');
            await PunishUsers(lang, [message.member!], [...cachedMessages, ...duplicateMatches, ...spamMatches, ...spamOtherDuplicates, currentMessage], options);
            return sanctioned = true;
        }

        if (userCanBePunish && similarMessages && similarMessages.length! >= options.similarMessageThreshold) {
            console.log('Envoie des message trop ressemblant et vite -> punis');
            await PunishUsers(lang, [message.member!], [...similarMessages, ...spamOtherDuplicates], options);
            return sanctioned = true;
        }
    },
};
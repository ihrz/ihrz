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

import { DatabaseStructure } from '../../../types/database_structure.js';

import { AntiSpam } from '../../../types/antispam.js';
import { BotEvent } from '../../../types/event.js';
import { LanguageData } from '../../../types/languageData.js';
import { time } from 'node:console';

export const cache: AntiSpam.AntiSpamCache = {
    raidInfo: new Map<string, Map<string, number | boolean>>(),
    messages: new Map<string, Set<AntiSpam.CachedMessage>>(),
    membersToPunish: new Map<string, Set<GuildMember>>(),
    membersFlags: new Map<string, Map<string, number>>()
};

const timeouts: Record<string, NodeJS.Timeout> = {};

async function waitForFinish(guildId: string): Promise<void> {
    return new Promise((resolve) => {
        if (timeouts[guildId]) clearTimeout(timeouts[guildId]);
        timeouts[guildId] = setTimeout(() => {
            resolve();
        }, 5000);
    });
}

async function logsAction(lang: LanguageData, message: Message, users: Set<GuildMember>, sanctionType: 'mute' | 'kick' | 'ban') {
    if (users.size === 0) return;

    const firstUser = users.values().next().value;
    const inDb = await message.client.db.get(`${message.guildId}.GUILD.SERVER_LOGS.antispam`) as string | null;

    if (!inDb) return;

    const channel = firstUser?.guild.channels.cache.get(inDb);
    if (!channel) return;

    let embed = new EmbedBuilder()
        .setColor("#e4433f")
        .setTimestamp()
        .setTitle(lang.antispam_log_embed_title.replace('${actionType}', sanctionType))
        .setDescription(lang.antispam_log_embed_desc
            .replace("${client.user?.toString()}", message.client.user?.toString()!)
            .replace("${actionType}", 'sanction')
            .replace("${user.toString()}", Array.from(users).map(x => x.toString()).join(','))
        )

    await (channel as BaseGuildTextChannel).send({ embeds: [embed] });
}

async function sendWarningMessage(
    lang: LanguageData,
    members: Set<GuildMember>,
    channel: BaseGuildTextChannel | null,
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const membersToWarn = [...members];

    if (membersToWarn.length === 0) return;

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

async function clearSpamMessages(message: Message, messages: Set<AntiSpam.CachedMessage>): Promise<void> {
    try {
        const CHUNK_SIZE = 15;
        const messagesByChannel: Collection<Snowflake, Collection<string, Snowflake>> = new Collection();

        messages.forEach(cachedMessage => {
            if (cachedMessage.isSpam) {
                const channelMessages = messagesByChannel.get(cachedMessage.channelID) || new Collection<string, Snowflake>();
                channelMessages.set(cachedMessage.messageID, cachedMessage.messageID);
                messagesByChannel.set(cachedMessage.channelID, channelMessages);
            }
        });

        await Promise.all(messagesByChannel.map(async (messageIds, channelId) => {
            const channel = message.guild?.channels.cache.get(channelId) as BaseGuildTextChannel | undefined;
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
                    } catch { }
                }
            }
        }));
    } catch { }
}

async function PunishUsers(
    guildId: string,
    members: Set<GuildMember>,
    options: AntiSpam.AntiSpamOptions
): Promise<void> {
    const membersCleaned = [...new Set(members)];

    const punishPromises = membersCleaned.map(async (member) => {
        let time = options.punishTime;

        switch (options.punishment_type) {
            case 'mute':
                const userCanBeMuted =
                    member.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers) &&
                    member.guild.members.me.roles.highest.position > member.roles.highest.position &&
                    member.id !== member.guild.ownerId;

                if (userCanBeMuted) {
                    await member.timeout(time, 'Spamming');
                    await member.client.method.warnMember(
                        member.guild?.members.me!,
                        member!,
                        "Antispam Punishment"
                    ).catch(() => { });
                }
                break;
            case 'ban':
                const userCanBeBanned =
                    member.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers) &&
                    member.guild.members.me.roles.highest.position > member.roles.highest.position &&
                    member.id !== member.guild.ownerId &&
                    member.bannable;

                if (userCanBeBanned) {
                    await member.ban({ reason: 'Spamming!' }).catch(() => { });
                }
                break;
            case 'kick':
                const userCanBeKicked =
                    member.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers) &&
                    member.guild.members.me.roles.highest.position > member.roles.highest.position &&
                    member.id !== member.guild.ownerId &&
                    member.kickable;

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

        // Check if the member have roles to bypass antispam 
        for (let role in options.BYPASS_ROLES) {
            if (message.member?.roles.cache.has(options.BYPASS_ROLES[parseInt(role)]))
                return false; // yes -> cancels the analysation
        };

        // Basic checks (if is in guild, if the antispam are configured etc)
        if (
            !message.guild ||
            message.author.id === message.client.user.id ||
            !options.Enabled ||
            message.guild.ownerId === message.author.id ||
            message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
            (options.ignoreBots && message.author.bot) ||
            options.BYPASS_CHANNELS?.includes(message.channelId)
        ) {
            return false;
        }

        let lang = await client.func.getLanguageData(message.guild.id);

        let currentMessage: AntiSpam.CachedMessage = {
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
        if (!cache.membersFlags.get(message.guild.id)!.get(`${message.author.id}`)) {
            cache.membersFlags.get(message.guild.id)!.set(`${message.author.id}`, 0)
        }

        // Load cache message
        const guildCacheMessages = cache.messages.get(message.guild.id)!;
        const previousMessages = Array.from(guildCacheMessages);

        // Add current message in cache
        guildCacheMessages.add(currentMessage);

        let memberTotalWarn = cache.membersFlags.get(message.guild.id)!.get(message.author.id)!;

        const lastMessage = previousMessages.filter(x => x.authorID === message.author.id).slice(-1)[0];
        const elapsedTime = lastMessage ? currentMessage.sentTimestamp - lastMessage.sentTimestamp : options.maxInterval - 100;

        // Basic checks
        if (elapsedTime && elapsedTime < options.maxInterval) {
            cache.membersFlags.get(message.guild.id)!.set(`${message.author.id}`, memberTotalWarn + 1);
            currentMessage.isSpam = true;
        }
        if (cache.membersFlags.get(message.guild.id)!.get(`${message.author.id}`)! >= options.Threshold) {
            cache.membersToPunish.get(message.guild.id)!.add(message.member!);
            currentMessage.isSpam = true;
        };

        // if the member break the threshold
        if (cache.membersToPunish.get(message.guild.id)!.size >= 1 && cache.membersFlags.get(message.guild.id)!.get(`${message.author.id}`)! >= options.Threshold) {
            currentMessage.isSpam = true;

            let membersToPunish = cache.membersToPunish.get(message.guild.id);
            let guildRaidInfo = cache.raidInfo.get(message.guild.id);

            if (!guildRaidInfo?.has(`${message.author.id}.timeout`)) {
                guildRaidInfo?.set(`${message.author.id}.timeout`, 0);
            }

            const timeout = guildRaidInfo?.get(`${message.author.id}.timeout`) as number;
            const currentTime = Date.now();

            if (timeout < currentTime) {
                guildRaidInfo?.set(`${message.author.id}.timeout`, currentTime + 5000);
            }

            if (timeout < currentTime) {
                await waitForFinish(message.guildId!);
                await PunishUsers(message.guild.id, membersToPunish!, options);
                await clearSpamMessages(message, cache.messages.get(message.guild.id)!);
                await sendWarningMessage(lang, membersToPunish!, message.channel as BaseGuildTextChannel, options);
                await logsAction(lang, message, membersToPunish!, options.punishment_type);
                membersToPunish?.clear();
            }
        }
    },
};

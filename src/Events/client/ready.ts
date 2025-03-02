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

import { Client, Collection, PermissionsBitField, ActivityType, EmbedBuilder, GuildFeature, User, BaseGuildTextChannel } from 'discord.js';
import { PfpsManager_Init } from "../../core/modules/pfpsManager.js";
import { format } from '../../core/functions/date_and_time.js';

import status from "../../files/status.json" with { "type": "json" }
import logger from "../../core/logger.js";

import { BotEvent } from '../../../types/event.js';
import { GiveawayManager } from '../../core/modules/giveawaysManager.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { CacheStorage } from '../../core/cache.js';
import { recoverActiveSessions } from '../stats/onVoiceUpdate.js';
import { getCacheStorage } from '../../core/core.js';

export const event: BotEvent = {
    name: "ready",
    run: async (client: Client) => {

        async function fetchInvites() {
            client.guilds.cache.forEach(async (guild) => {
                try {
                    if (!guild.members.me?.permissions.has([PermissionsBitField.Flags.ManageGuild, PermissionsBitField.Flags.ViewAuditLog])) return;
                    guild.invites.fetch().then(guildInvites => {
                        client.invites.set(guild.id, new Collection(guildInvites.map((invite) => [invite.code, invite.uses])));

                        if (guild.features.includes(GuildFeature.VanityURL)) {
                            guild.fetchVanityData().then((vanityInvite) => {
                                client.vanityInvites.set(guild.id, vanityInvite);
                            });
                        }
                    })
                } catch (error: any) {
                    logger.err(`Error fetching invites for guild ${guild.id}: ${error}`.red);
                };
            });
        };

        async function refreshDatabaseModel() {
            await client.db.table(`TEMP`).deleteAll();
            let table = client.db.table('OWNER');

            let owners = [...new Set([...client.owners, ...(await table.all()).map(x => x.id)])];

            owners.forEach(async ownerId => {
                try {
                    let user = await client.users?.fetch(ownerId);
                    if (user) {
                        await table.set(user.id, { owner: true });
                    }
                } catch {
                    await table.delete(ownerId);
                }
            });
        };

        async function quotesPresence() {
            client.user?.setPresence({ activities: [{ name: status.current[Math.floor(Math.random() * status.current.length)], type: ActivityType.Custom }] });
        };

        async function refreshSchedule() {
            let table = client.db.table("SCHEDULE");
            let listAll = await table.all();

            let dateNow = Date.now();
            let desc: string = '';

            Object.entries(listAll).forEach(async ([userId, array]) => {

                let member = client.users.cache.get(array.id) as User;

                for (let ScheduleId in array.value) {
                    if (array.value[ScheduleId]?.expired <= dateNow) {
                        desc += `${format(new Date(array.value[ScheduleId]?.expired), 'YYYY/MM/DD HH:mm:ss')}`;
                        desc += `\`\`\`${array.value[ScheduleId]?.title}\`\`\``;
                        desc += `\`\`\`${array.value[ScheduleId]?.description}\`\`\``;

                        let embed = new EmbedBuilder()
                            .setColor('#56a0d3')
                            .setTitle(`#${ScheduleId} Schedule has been expired!`)
                            .setDescription(desc)
                            .setThumbnail((member.displayAvatarURL()))
                            .setTimestamp()
                            .setFooter({ text: 'iHorizon', iconURL: "attachment://footer_icon.png" });

                        member?.send({
                            content: member.toString(),
                            embeds: [embed],
                            files: [await client.func.displayBotName.footerAttachmentBuilder(client)]
                        }).catch(() => { });

                        await table.delete(`${array.id}.${ScheduleId}`);
                    };

                }
            });
        };

        async function refreshBotData() {
            await client.db.set("BOT", {
                "info": {
                    members: client.guilds.cache.reduce((a, b) => a + b.memberCount, 0),
                    servers: client.guilds.cache.size,
                    shards: client.shard?.count,
                    ping: client.ws.ping
                },
                "content": {
                    commands: client.commands.size + client.message_commands.size + client.applicationsCommands.size,
                    category: client.category.length
                },
                "user": client.user
            })
        }

        async function statsRefresher() {
            const currentTime = Date.now();
            const fourteenDaysInMillis = 30 * 24 * 60 * 60 * 1000;

            (await client.db.all()).forEach(async (index, value) => {
                let guild = index.value as DatabaseStructure.DbInId;
                let stats = guild.STATS?.USER;

                if (stats) {
                    Object.keys(stats).forEach(userId => {
                        let userStats = stats[userId];

                        if (userStats.messages) {
                            userStats.messages = userStats.messages.filter((message: DatabaseStructure.StatsMessage) => {
                                return (currentTime - message.sentTimestamp) <= fourteenDaysInMillis;
                            });
                        }
                        if (userStats.voices) {
                            userStats.voices = userStats.voices.filter((voice: DatabaseStructure.StatsVoice) => {
                                return (currentTime - voice.endTimestamp) <= fourteenDaysInMillis;
                            });
                        }
                    });
                    await client.db.set(index.id, guild);
                }
            });
        }

        // @ts-ignore
        client.giveawaysManager = new GiveawayManager(client, {
            storage: `${process.cwd()}/src/files/giveaways/`,
            config: {
                botsCanWin: false,
                embedColor: '#9a5af2',
                embedColorEnd: '#2f3136',
                reaction: '🎉',
                botName: "iHorizon",
                forceUpdateEvery: 3600,
                endedGiveawaysLifetime: 345_600_000,
            },
        });

        await client.player.init({ id: client.user?.id as string, username: 'bot_' + client.user?.id });

        await recoverActiveSessions(client);
        await client.memberCountManager.init();
        await client.autoRenewManager.init();
        await client.ownihrz.Startup_Cluster();
        await client.notifier.start();

        setInterval(quotesPresence, 120_000), setInterval(refreshSchedule, 15_000), setInterval(refreshBotData, 45_000);

        fetchInvites(), refreshDatabaseModel(), quotesPresence(), refreshSchedule(), refreshBotData(), statsRefresher();

        PfpsManager_Init(client);

        let initData = getCacheStorage();

        let oldV = initData?._cache.version;
        let newV = client.version.version;

        if (oldV !== newV) {
            let sendingContent = {
                content: "@everyone **New update available !**",
                embeds: [
                    new EmbedBuilder()
                        .setTimestamp()
                        .setURL(`https://github.com/ihrz/ihrz/compare/${oldV}...${newV}`)
                        .setTitle(`Click me to see the changelog [${oldV} -> ${newV}]`)
                ]
            };

            if (client.version.env !== "dev" && client.version.env !== "production") {
                Array.from(new Set([client.config.owner.ownerid1, client.config.owner.ownerid2])).forEach(async usr => {
                    let user = await client.users.fetch(usr);
                    sendingContent.content = "**New update available !**"
                    user.send(sendingContent).catch(() => false);
                });
            } else {
                let channel_to_send = client.channels.cache.get(initData?._cache.updateChannelId || "00") as BaseGuildTextChannel | undefined;
                channel_to_send?.send(sendingContent).catch(() => false);
            }

            CacheStorage.set('stored_data._cache.version', newV);

        }

        if (client.version.env === "production") {
            try {
                // Global counters
                let totalGuilds = 0;
                let totalRoles = 0;
                let totalChannels = 0;
                let totalMembers = 0;
                let totalUniqueUsers = new Set();

                // Fetch all guilds
                const guilds = await client.guilds.fetch();

                logger.legacy('\n=== Starting Cache Loading Process ===\n');

                for (const [guildId, guild] of guilds) {
                    totalGuilds++;
                    logger.legacy(`📋 Processing Guild: ${guild.name} (${guild.id})`);

                    // Load complete guild
                    const fullGuild = await guild.fetch();

                    // Load roles
                    const roles = await fullGuild.roles.fetch();
                    totalRoles += roles.size;
                    logger.legacy(`   ┣━ Roles Loaded: ${roles.size}`);

                    // Load channels
                    const channels = await fullGuild.channels.fetch();
                    totalChannels += channels.size;
                    logger.legacy(`   ┣━ Channels Loaded: ${channels.size}`);

                    // Load members with chunking
                    try {
                        // Request guild members chunking
                        await fullGuild.members.fetch()
                            .then(members => {
                                totalMembers += members.size;
                                members.forEach(member => totalUniqueUsers.add(member.user.id));
                                logger.legacy(`   ┗━ Members Loaded: ${members.size}`);
                            })
                            .catch(error => {
                                if (error.code === 'GuildMembersTimeout') {
                                    logger.legacy(`   ┗━ ⚠️ Partial Members Load: Timeout occurred for ${fullGuild.name}`);
                                } else {
                                    throw error;
                                }
                            });
                    } catch (memberError) {
                        console.error(`   ┗━ ❌ Error loading members for ${fullGuild.name}:`, memberError);
                    }
                    logger.legacy(''); // Empty line for readability
                }

                // Print global statistics
                logger.legacy('=== Global Cache Statistics ===');
                logger.legacy(`📊 Total Guilds: ${totalGuilds}`);
                logger.legacy(`👥 Total Unique Users: ${totalUniqueUsers.size}`);
                logger.legacy(`👤 Total Members (including duplicates): ${totalMembers}`);
                logger.legacy(`📜 Total Roles: ${totalRoles}`);
                logger.legacy(`📝 Total Channels: ${totalChannels}`);
                logger.legacy('\n=== Cache Loading Complete ===');

            } catch (error) {
                console.error('❌ Error while loading caches:', error);
            }
        }

        logger.log(`${client.config.console.emojis.HOST} >> Bot is ready`.white);
    },
};

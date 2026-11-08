/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	Client,
	Collection,
	PermissionsBitField,
	ActivityType,
	EmbedBuilder,
	GuildFeature,
	User,
	BaseGuildTextChannel,
	Vanity
} from "discord.js";
import { PfpsManager_Init } from "../../core/modules/pfpsManager.js";
import { format } from "../../core/functions/date_and_time.js";

import logger from "../../core/logger.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { recoverActiveSessions } from "../stats/onVoiceUpdate.js";
import { writeFileSync } from "node:fs";
import {
	readablePermissionField,
	withReadablePermissions
} from "../../core/commandsSync.js";
import { recoverCustomVoiceChannels } from "../voicedashboard/voiceState.js";
import { getShardStats } from "../../Interaction/HybridCommands/bot/botinfo.js";
import { AvailableLanguage } from "../../core/functions/getLanguageData.js";
import { Expressions } from "../../core/functions/randomExpression.js";
import { recoverPendingGuildDataDeletions } from "./deleteDatabaseDataOnGuildLeave.js";
import { usersNamesMap } from "../../core/prevnamesModule.js";
import {
	prefetchFloweryVoices,
	cleanupOrphanedTTS
} from "../../core/modules/ttsManager.js";
import { checkAndNotifyRelease } from "../../core/modules/releaseNotifier.js";
import { commandLogs } from "../logs/slashCommandLogger.js";
import {
	recoverH247Sessions,
	watchdogH247Sessions
} from "../../core/modules/h247Manager.js";
import path from "node:path";
import {
	ownerTable,
	scheduleTable,
	metasTable,
	initTables
} from "../../core/database/tables.js";
import { Team } from "../../../types/teams.js";

export {
	tempTable,
	blacklistTable,
	ownerTable,
	profilTable,
	authRestoreTable,
	prevnamesTable,
	apiTable,
	scheduleTable,
	metasTable,
	giveawaysTable,
	backupsTable,
	backupSchedulesTable
} from "../../core/database/tables.js";

export const event: BotEvent = {
	name: "clientReady",
	run: async (client: Client) => {
		await initTables(client, [
			"tempTable",
			"blacklistTable",
			"ownerTable",
			"profilTable",
			"authRestoreTable",
			"prevnamesTable"
		]);
		await recoverPendingGuildDataDeletions(client);
		await initTables(client, [
			"apiTable",
			"scheduleTable",
			"metasTable",
			"giveawaysTable",
			"backupsTable",
			"backupSchedulesTable"
		]);

		// Only the main shard creates application emojis; the others read them.
		await client.emojisManager.startSync({ create: client.isMainShard() });

		prefetchFloweryVoices();
		cleanupOrphanedTTS(client);

		async function fetchInvites() {
			const guilds = [...client.guilds.cache.values()];
			const batchSize = 5;

			for (let i = 0; i < guilds.length; i += batchSize) {
				const batch = guilds.slice(i, i + batchSize);

				await Promise.all(
					batch.map(async (guild) => {
						try {
							const me = guild.members.me;

							if (
								!me?.permissions.has([
									PermissionsBitField.Flags.ManageGuild,
									PermissionsBitField.Flags.ViewAuditLog
								])
							)
								return;

							// Fetch invites
							const invites = await guild.invites.fetch();

							client.invites.set(
								guild.id,
								new Collection(
									invites.map((invite) => [
										invite.code,
										{
											uses: invite.uses,
											inviterId: invite.inviterId,
											inviterUsername:
												invite.inviter?.username || null
										}
									])
								)
							);

							// Fetch vanity only if guild has it
							if (
								guild.features.includes(GuildFeature.VanityURL)
							) {
								try {
									const vanity =
										await guild.fetchVanityData();
									logger.debug(
										"invite-fetcher",
										guild.name,
										vanity
									);

									client.vanityInvites.set(guild.id, {
										code: vanity.code,
										uses: vanity.uses
									});
								} catch {
									client.vanityInvites.set(guild.id, null);
								}
							} else {
								client.vanityInvites.set(guild.id, null);
							}
						} catch (error: any) {
							logger.err(
								`Error fetching invites for guild ${guild.id}: ${error}`
							);
						}
					})
				);
			}
		}

		async function refreshDatabaseModel() {
			// await tempTable.deleteAll();
			const owners = await client.func.ownerHelper.getBotOwner();

			owners.forEach(async (ownerId) => {
				try {
					const user =
						client.users.cache.get(ownerId) ||
						(await client.users?.fetch(ownerId));
					if (user) {
						await ownerTable.set(user.id, { owner: true });
					}
				} catch {
					await ownerTable.delete(ownerId);
				}
			});
		}

		async function quotesPresence() {
			return;
			// client.user?.setPresence({
			// 	activities: [
			// 		{
			// 			name: `Shards #${client.shard?.ids[0]} | ${(await getShardStats(client)).guilds.toString()} Servers | www.ihorizon.org`,
			// 			type: ActivityType.Playing
			// 		}
			// 	],
			// 	shardId: client.shard?.ids[0]
			// });
		}

		async function refreshSchedule() {
			// Users are fetched below, so one shard sends: it would be one DM
			// per shard otherwise.
			if (!client.isMainShard()) return;

			const listAll = await scheduleTable.all();

			const dateNow = Date.now();

			Object.entries(listAll).forEach(async ([userId, array]) => {
				for (const ScheduleId in array.value) {
					if (array.value[ScheduleId]?.expired <= dateNow) {
						// A reminder is removed once sent, or when it can never
						// be (unknown user, DMs closed); anything else retries
						// on the next tick. The cache misses most users.
						let member: User | null = null;
						try {
							member = await client.users.fetch(array.id);
						} catch (error: any) {
							if (error?.code !== 10013) continue;
						}

						// Une description PAR rappel : un accumulateur partagé
						// envoyait le contenu des rappels d'autres utilisateurs
						// dans le DM de chacun (fuite + injection inter-users).
						// Each block on its own lines: glued to the date and to each
						// other, the fences broke and showed up as backticks. A fence
						// typed in the text would close the block, so it is split.
						const block = (text: unknown) =>
							`\`\`\`\n${String(text ?? "").replaceAll("```", "`\u200b``")}\n\`\`\``;
						const desc = [
							format(
								new Date(array.value[ScheduleId]?.expired),
								"YYYY/MM/DD HH:mm:ss"
							),
							block(array.value[ScheduleId]?.title),
							block(array.value[ScheduleId]?.description)
						].join("\n");

						const embed = new EmbedBuilder()
							.setColor("#56a0d3")
							.setTitle(
								`#${ScheduleId} Schedule has been expired!`
							)
							.setDescription(desc)
							.setThumbnail(Expressions.Nerd)
							.setTimestamp()
							.setFooter({
								text: "iHorizon",
								iconURL: "attachment://footer_icon.png"
							});

						try {
							await member?.send({
								content: member.toString(),
								embeds: [embed],
								files: [
									await client.func.displayBotName.footerAttachmentBuilder()
								]
							});
						} catch (error: any) {
							if (error?.code !== 50007) continue;
						}

						await scheduleTable.delete(`${array.id}.${ScheduleId}`);
					}
				}
			});
		}

		async function refreshBotData() {
			// broadcastEval throws ShardingInProcess while shards are still
			// spawning: short retry instead of failing the boot push.
			const MAX_RETRIES = 12;
			const RETRY_MS = 5_000;
			for (let attempt = 1; ; attempt++) {
				try {
					const result = await getShardStats(client);
					const pushedAt = Date.now();

					await metasTable.set("BOT", {
						info: {
							members: result.users,
							servers: result.guilds,
							shards: client.shard?.count,
							ping: client.infrastructureMonitoring.getAverageWebsocketPing()
						},
						content: {
							commands:
								client.commands.size +
								client.message_commands.size +
								client.applicationsCommands.size,
							category: client.category.length,
							langs: AvailableLanguage.map((x) => x.name)
						},
						user: {
							username: client.user?.username,
							tag: client.user?.tag,
							id: client.user?.id,
							discriminator: client.user?.discriminator,
							avatar: client.user?.displayAvatarURL({
								extension: "png",
								size: 4096
							}),
							bio: client.func.retrieveMyself.retrieveBio()
						},
						team: await getTeam(),
						community: {
							servers: await getCommunityServers()
						},
						lastPushAt: pushedAt,
						lastPushAtISO: new Date(pushedAt).toISOString(),
						writerShard: client.shard?.ids[0] ?? 0
					});
					return;
				} catch (error: any) {
					const isShardingInProcess =
						error?.name?.includes("ShardingInProcess") ||
						String(error?.message ?? error).includes(
							"still being spawned"
						);
					if (!isShardingInProcess || attempt > MAX_RETRIES) {
						logger.err(
							`refreshBotData failed (shard #${client.shard?.ids[0] ?? 0}): ${error}`
						);
						return;
					}
					await new Promise((resolve) =>
						setTimeout(resolve, RETRY_MS)
					);
				}
			}
		}

		async function getCommunityServers(): Promise<
			DatabaseStructure.CommunityServer[]
		> {
			const guilds =
				await client.func.shard_helper.getCommunityGuildsData(
					client,
					2000
				);

			// Biggest communities first; only name, icon and member count are public.
			return guilds.sort((a, b) => b.members - a.members);
		}

		async function getTeam(): Promise<Team> {
			const us: (User | null)[] = await Promise.all(
				client.owners.map(
					async (x) =>
						client.users.cache.get(x) ||
						(await client.users.fetch(x).catch(() => null))
				)
			);

			return Promise.all(
				us
					.filter((x): x is User => x !== null)
					.map(async (x) => ({
						id: x.id,
						username: x.username,
						avatarUrl: x.displayAvatarURL({
							extension: "png",
							size: 4096
						}),
						bannerUrl: await client.func.bannerURL(x, {
							extension: "png"
						}),
						owner: true
					}))
			);
		}

		async function statsRefresher() {
			const currentTime = Date.now();
			const retentionInMillis = 30 * 24 * 60 * 60 * 1000;

			for (const guild of client.guilds.cache.values()) {
				try {
					await trimGuildStats(guild.id);
				} catch (error) {
					// One failing guild must not abort the trim for the others.
					logger.err(
						`Stats trim failed for guild ${guild.id}: ${error}`
					);
				}
			}

			async function trimGuildStats(guildId: string) {
				// Read only the stats sub-tree and write back only the users
				// that actually lost entries: a full-document read-modify-write
				// moved megabytes both ways and raced with concurrent writes
				// (every message pushes into STATS.USER.<id>.messages).
				const stats = await client.db.get<
					Record<string, DatabaseStructure.UserStats>
				>(`${guildId}.STATS.USER`);

				if (!stats) return;

				for (const [userId, userStats] of Object.entries(stats)) {
					if (userStats.messages) {
						const kept = userStats.messages.filter(
							(message: DatabaseStructure.StatsMessage) =>
								currentTime - message.sentTimestamp <=
								retentionInMillis
						);
						if (kept.length !== userStats.messages.length) {
							await client.db.set(
								`${guildId}.STATS.USER.${userId}.messages`,
								kept
							);
						}
					}
					if (userStats.voices) {
						const kept = userStats.voices.filter(
							(voice: DatabaseStructure.StatsVoice) =>
								currentTime - voice.endTimestamp <=
								retentionInMillis
						);
						if (kept.length !== userStats.voices.length) {
							await client.db.set(
								`${guildId}.STATS.USER.${userId}.voices`,
								kept
							);
						}
					}
				}
			}
		}

		client.player
			.init({
				id: client.user?.id as string,
				username: "bot_" + client.user?.id
			})
			.then(() => {});
		recoverActiveSessions(client).then(() => {});
		recoverH247Sessions(client).catch((err) => {
			logger.err("H24/7 session recovery failed:", err);
		});
		client.memberCountManager.init().then(() => {});
		client.gatewayLink.start();
		// Command logs: boot purge, and on shard 0 the old log file moved
		// into the database, without waiting for the first command.
		commandLogs(client);
		client.autoRenewManager.init().then(() => {});
		client.nightmodeManager.init().then(() => {});
		client.notifier.start().then(() => {});
		client.blogger.start().then(() => {});
		client.infrastructureMonitoring.startMonitoring().then(() => {});
		client.temproleManager.init();
		client.tempbanManager.init();
		client.giveawaysManager.init();
		checkAndNotifyRelease(client).catch((err) => {
			logger.err("Release notifier failed:", err);
		});

		await client.email.init(true);

		(setInterval(quotesPresence, 120_000),
			setInterval(refreshSchedule, 50_000),
			setInterval(() => {
				client.backup.runDueBackupSchedules(client).catch((err) => {
					logger.err("Scheduled backups failed:", err);
				});
			}, 300_000),
			setInterval(() => recoverCustomVoiceChannels(client), 120_000),
			setInterval(
				() =>
					watchdogH247Sessions(client).catch((err) => {
						logger.err("H24/7 watchdog failed:", err);
					}),
				60_000
			));

		if (client.isMainShard()) {
			logger.log(
				`refreshBotData interval scheduled (shard #${client.shard?.ids[0] ?? 0})`
			);
			setInterval(() => {
				void refreshBotData();
			}, 45_000);
		}

		(fetchInvites(),
			refreshDatabaseModel(),
			quotesPresence(),
			refreshSchedule(),
			statsRefresher());

		// BOT push is main-shard only: every shard overwriting the key at
		// boot raced, and non-main shards have no use for broadcastEval here.
		if (client.isMainShard()) {
			refreshBotData();
		}

		PfpsManager_Init(client);

		logger.log(
			`${client.config.console.emojis.HOST} >> Bot is ready`.white
		);

		client.guilds.cache.forEach((guild) => {
			for (const member of guild.members.cache.values()) {
				usersNamesMap.set(member.user.id, {
					username: member.user.username,
					globalName: member.user.globalName
				});
			}
		});

		if (client.version.env === "dev") {
			writeFileSync(
				path.join(process.cwd(), "src", "files", "commands.json"),
				JSON.stringify(
					// Commands load asynchronously: sort by name (plain code point
					// order, locale independent) so the file is stable between boots.
					[...client.commands.values()]
						.sort((a, b) =>
							a.name < b.name ? -1 : a.name > b.name ? 1 : 0
						)
						.map((x) => {
							return {
								name: x.name,
								prefix_name: x.prefixName,
								name_translated: x.name_localizations,

								description: x.description,
								description_translated:
									x.description_localizations,

								category: x.category,
								...readablePermissionField(x.permission),
								options: withReadablePermissions(x.options),
								aliases: x.aliases,
								thinking: x.thinking,
								ephemeral: x.ephemeral
							};
						}),
					null,
					4
				)
			);
		}

		if (client.email.connected && client.isMainShard()) {
			client.email.send(
				client.email.ownerMail,
				"Bot Is Ready",
				`
=== AUTO-GENERATED MESSAGE ===

iHorizon (${client.user?.tag}) is online

since ${new Date()}

on shard #${client.shard?.ids[0]}

=== AUTO-GENERATED MESSAGE ===
`
			);
		}
	}
};

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
import { removePermissionProperties } from "../../core/commandsSync.js";
import { recoverCustomVoiceChannels } from "../voicedashboard/voiceState.js";
import { getShardStats } from "../../Interaction/HybridCommands/bot/botinfo.js";
import { isNumber } from "../../core/functions/method.js";
import { DB } from "../../core/database/types.js";
import { AvailableLanguage } from "../../core/functions/getLanguageData.js";
import { Expressions } from "../../core/functions/randomExpression.js";
import { recoverPendingGuildDataDeletions } from "./deleteDatabaseDataOnGuildLeave.js";
import { usersNamesMap } from "../../core/prevnamesModule.js";
import {
	prefetchFloweryVoices,
	cleanupOrphanedTTS
} from "../../core/modules/ttsManager.js";
import { checkAndNotifyRelease } from "../../core/modules/releaseNotifier.js";
import path from "node:path";

// @ts-ignore
export let tempTable: DB = null;
// @ts-ignore
export let blacklistTable: DB = null;
// @ts-ignore
export let ownerTable: DB = null;
// @ts-ignore
export let profilTable: DB = null;
// @ts-ignore
export let authRestoreTable: DB = null;
// @ts-ignore
export let prevnamesTable: DB = null;
// @ts-ignore
export let apiTable: DB = null;
// @ts-ignore
export let scheduleTable: DB = null;
// @ts-ignore
export let metasTable: DB = null;
// @ts-ignore
export let giveawaysTable: DB = null;
// @ts-ignore
export let backupsTable: DB = null;

export const event: BotEvent = {
	name: "clientReady",
	run: async (client: Client) => {
		let db = client.db2 ? client.db2 : client.db;
		tempTable = await db.table("temp");
		blacklistTable = await db.table("blacklist");
		ownerTable = await db.table("owner");
		profilTable = await db.table("user_profil");
		authRestoreTable = await db.table("authrestore");
		prevnamesTable = await db.table("prevnames");
		await recoverPendingGuildDataDeletions(client);
		apiTable = await db.table("api");
		scheduleTable = await db.table("schedule");
		metasTable = await db.table("metas");
		giveawaysTable = await db.table("giveaways");
		backupsTable = await db.table("backups");

		await client.emojisManager.startSync();

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
			const listAll = await scheduleTable.all();

			const dateNow = Date.now();
			let desc: string = "";

			Object.entries(listAll).forEach(async ([userId, array]) => {
				const member = client.users.cache.get(array.id) as User;

				for (const ScheduleId in array.value) {
					if (array.value[ScheduleId]?.expired <= dateNow) {
						desc += `${format(new Date(array.value[ScheduleId]?.expired), "YYYY/MM/DD HH:mm:ss")}`;
						desc += `\`\`\`${array.value[ScheduleId]?.title}\`\`\``;
						desc += `\`\`\`${array.value[ScheduleId]?.description}\`\`\``;

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

						member
							?.send({
								content: member.toString(),
								embeds: [embed],
								files: [
									await client.func.displayBotName.footerAttachmentBuilder()
								]
							})
							.catch(() => {});

						await scheduleTable.delete(`${array.id}.${ScheduleId}`);
					}
				}
			});
		}

		async function refreshBotData() {
			const result = await getShardStats(client);

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
				}
			});
		}

		async function statsRefresher() {
			const currentTime = Date.now();
			const fourteenDaysInMillis = 30 * 24 * 60 * 60 * 1000;

			(await client.db.all())
				.filter((x) => isNumber(x.id))
				.filter((x) => client.inShard(x.id))
				.forEach(async (index, value) => {
					const guild = index.value as DatabaseStructure.DbInId;
					const stats = guild.STATS?.USER;

					if (stats && client.inShard(index.id)) {
						Object.keys(stats).forEach((userId) => {
							const userStats = stats[userId];

							if (userStats.messages) {
								userStats.messages = userStats.messages.filter(
									(
										message: DatabaseStructure.StatsMessage
									) => {
										return (
											currentTime -
												message.sentTimestamp <=
											fourteenDaysInMillis
										);
									}
								);
							}
							if (userStats.voices) {
								userStats.voices = userStats.voices.filter(
									(voice: DatabaseStructure.StatsVoice) => {
										return (
											currentTime - voice.endTimestamp <=
											fourteenDaysInMillis
										);
									}
								);
							}
						});
						await client.db.set(index.id, guild);
					}
				});
		}

		client.player
			.init({
				id: client.user?.id as string,
				username: "bot_" + client.user?.id
			})
			.then(() => {});
		recoverActiveSessions(client).then(() => {});
		client.memberCountManager.init().then(() => {});
		client.autoRenewManager.init().then(() => {});
		client.nightmodeManager.init().then(() => {});
		client.notifier.start().then(() => {});
		client.blogger.start().then(() => {});
		client.infrastructureMonitoring.startMonitoring().then(() => {});
		client.temproleManager.init();
		client.tempbanManager.init();
		client.giveawaysManager.init();
		checkAndNotifyRelease(client).catch(() => {});

		await client.email.init(true);

		(setInterval(quotesPresence, 120_000),
			setInterval(refreshSchedule, 50_000),
			setInterval(() => recoverCustomVoiceChannels(client), 120_000));
		if (client.isMainShard()) setInterval(refreshBotData, 45_000);

		(fetchInvites(),
			refreshDatabaseModel(),
			quotesPresence(),
			refreshSchedule(),
			refreshBotData(),
			statsRefresher());

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
					client.commands.map((x) => {
						return {
							name: x.name,
							prefix_name: x.prefixName,
							name_translated: x.name_localizations,

							description: x.description,
							description_translated: x.description_localizations,

							category: x.category,
							options: removePermissionProperties(x.options),
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

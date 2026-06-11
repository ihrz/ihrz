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
	Vanity,
	PresenceStatusData
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
		apiTable = await db.table("api");
		scheduleTable = await db.table("schedule");
		metasTable = await db.table("metas");
		giveawaysTable = await db.table("giveaways");
		backupsTable = await db.table("backups");

		await client.emojisManager.startSync();

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
										invite.uses
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
									client.vanityInvites.set(guild.id, {
										code: "",
										uses: 0
									});
								}
							} else {
								client.vanityInvites.set(guild.id, {
									code: "",
									uses: 0
								});
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
			let e = await client.db.get(`BOT.PRESENCE`);

			if (e) {
				client.user?.setPresence({
					status: e.status as PresenceStatusData,
					activities: [
						{
							type: e.type || ActivityType.Custom,
							name:
								e.name || "Custom this Presence with /presence",
							url: `https://www.twitch.tv/${e.twitch_username}`
						}
					]
				});
			} else {
				client.user?.setPresence({
					activities: [
						{
							name: "Custom this Presence with /presence",
							type: ActivityType.Custom
						}
					]
				});
			}
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
								text: client.user?.username!,
								iconURL: "attachment://icon.png"
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

		recoverActiveSessions(client).then(() => {});
		recoverCustomVoiceChannels(client).then(() => {});
		client.memberCountManager.init().then(() => {});
		client.autoRenewManager.init().then(() => {});
		client.nightmodeManager.init().then(() => {});
		client.temproleManager.init();
		client.tempbanManager.init();
		client.giveawaysManager.init();

		(fetchInvites(),
			refreshDatabaseModel(),
			quotesPresence(),
			refreshSchedule(),
			statsRefresher());

		setInterval(quotesPresence, 8000);
		PfpsManager_Init(client);

		await recoverActiveSessions(client);
		await recoverCustomVoiceChannels(client);
		await client.memberCountManager.init();
		await client.autoRenewManager.init();

		logger.log(
			`${client.config.console.emojis.HOST} >> Bot is ready`.white
		);
	}
};

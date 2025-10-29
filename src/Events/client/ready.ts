/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client, Collection, PermissionsBitField, ActivityType, EmbedBuilder, GuildFeature, User, BaseGuildTextChannel, PresenceStatusData } from 'discord.js';
import { PfpsManager_Init } from "../../core/modules/pfpsManager.js";
import { format } from '../../core/functions/date_and_time.js';

import status from "../../files/status.json" with { "type": "json" }
import logger from "../../core/logger.js";

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { recoverActiveSessions } from '../stats/onVoiceUpdate.js';
import { recoverCustomVoiceChannels } from '../voicedashboard/voiceState.js';
import { getShardStats } from '../../Interaction/HybridCommands/bot/botinfo.js';
import { isNumber } from '../../core/functions/method.js';
import { DB } from '../../core/database/types.js';
import { Horizon } from '../../core/database/driver/horizon.js';

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

export const event: BotEvent = {
	name: "clientReady",
	run: async (client: Client) => {
		if (client.config.database?.method.includes("horizon")) {
			await (client.db as Horizon).waitUntilReady();
		}
		let db = (client.db2 ? client.db2 : client.db);
		tempTable = await db.table("temp");
		blacklistTable = await db.table("blacklist");
		ownerTable = await db.table("owner");
		profilTable = await db.table("user_profil");
		authRestoreTable = await db.table("authrestore");
		prevnamesTable = await db.table("prevnames");
		apiTable = await db.table("api");
		scheduleTable = await db.table("schedule");
		metasTable = await db.table("metas");

		await client.emojisManager.startSync();

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
			// await tempTable.deleteAll();
			const owners = [...new Set([...client.owners, ...(await ownerTable.all()).map(x => x.id)])];

			owners.forEach(async ownerId => {
				try {
					const user = await client.users?.fetch(ownerId);
					if (user) {
						await ownerTable.set(user.id, { owner: true });
					}
				} catch {
					await ownerTable.delete(ownerId);
				}
			});
		};

		async function quotesPresence() {
			let e = await client.db.get(`BOT.PRESENCE`);

			if (e) {
				client.user?.setPresence({
					status: e.status as PresenceStatusData,
					activities: [
						{
							type: e.type || ActivityType.Custom,
							name: e.name || "Custom this Presence with /presence",
							url: `https://www.twitch.tv/${e.twitch_username}`
						}
					],
				});
			} else {
				client.user?.setPresence({ activities: [{ name: "Custom this Presence with /presence", type: ActivityType.Custom }] });
			};
		};

		async function refreshSchedule() {
			const listAll = await scheduleTable.all();

			const dateNow = Date.now();
			let desc: string = '';

			Object.entries(listAll).forEach(async ([userId, array]) => {

				const member = client.users.cache.get(array.id) as User;

				for (const ScheduleId in array.value) {
					if (array.value[ScheduleId]?.expired <= dateNow) {
						desc += `${format(new Date(array.value[ScheduleId]?.expired), 'YYYY/MM/DD HH:mm:ss')}`;
						desc += `\`\`\`${array.value[ScheduleId]?.title}\`\`\``;
						desc += `\`\`\`${array.value[ScheduleId]?.description}\`\`\``;

						const embed = new EmbedBuilder()
							.setColor('#56a0d3')
							.setTitle(`#${ScheduleId} Schedule has been expired!`)
							.setDescription(desc)
							.setThumbnail((member.displayAvatarURL()))
							.setTimestamp()
							.setFooter({ text: client.user?.username!, iconURL: "attachment://icon.png" });

						member?.send({
							content: member.toString(),
							embeds: [embed],
							files: [await client.func.displayBotName.footerAttachmentBuilder()]
						}).catch(() => { });

						await scheduleTable.delete(`${array.id}.${ScheduleId}`);
					};

				}
			});
		};

		async function statsRefresher() {
			const currentTime = Date.now();
			const fourteenDaysInMillis = 30 * 24 * 60 * 60 * 1000;

			((await client.db.all())
				.filter(x => isNumber(x.id))
				.filter(x => client.inShard(x.id))
			).forEach(async (index, value) => {
				const guild = index.value as DatabaseStructure.DbInId;
				const stats = guild.STATS?.USER;

				if (stats && client.inShard(index.id)) {
					Object.keys(stats).forEach(userId => {
						const userStats = stats[userId];

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

		setInterval(quotesPresence, 80_000), setInterval(refreshSchedule, 15_000);

		fetchInvites(), refreshDatabaseModel(), quotesPresence(), refreshSchedule(), statsRefresher();

		PfpsManager_Init(client);

		await recoverActiveSessions(client);
		await recoverCustomVoiceChannels(client);
		await client.memberCountManager.init();
		await client.autoRenewManager.init();

		logger.log(`${client.config.console.emojis.HOST} >> Bot is ready`.white);
	},
};

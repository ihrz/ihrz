/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client, Collection, PermissionsBitField, ActivityType, EmbedBuilder, GuildFeature, User, BaseGuildTextChannel } from 'discord.js';
import { PfpsManager_Init } from "../../core/modules/pfpsManager.js";
import { format } from '../../core/functions/date_and_time.js';

import status from "../../files/status.json" with { "type": "json" }
import logger from "../../core/logger.js";

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { recoverActiveSessions } from '../stats/onVoiceUpdate.js';
import { writeFileSync } from 'node:fs';
import { removePermissionProperties } from '../../core/commandsSync.js';
import { getCacheStorage } from '../../core/core.js';
import { recoverCustomVoiceChannels } from '../voicedashboard/voiceState.js';
import { getShardStats } from '../../Interaction/HybridCommands/bot/botinfo.js';
import { isNumber } from '../../core/functions/method.js';

export const event: BotEvent = {
	name: "ready",
	run: async (client: Client) => {
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
			// await client.db.table(`TEMP`).deleteAll();
			const table = await client.db.table('OWNER');

			const owners = [...new Set([...client.owners, ...(await table.all()).map(x => x.id)])];

			owners.forEach(async ownerId => {
				try {
					const user = await client.users?.fetch(ownerId);
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
			const table = await client.db.table("SCHEDULE");
			const listAll = await table.all();

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
							.setFooter({ text: 'iHorizon', iconURL: "attachment://footer_icon.png" });

						member?.send({
							content: member.toString(),
							embeds: [embed],
							files: [await client.func.displayBotName.footerAttachmentBuilder()]
						}).catch(() => { });

						await table.delete(`${array.id}.${ScheduleId}`);
					};

				}
			});
		};

		async function refreshBotData() {
			const ownihrz_table = await client.db.table("OWNIHRZ");
			const ownihrz_data = await ownihrz_table.get("CLUSTER")
			const result = await getShardStats(client);

			await client.db.set("BOT", {
				"info": {
					members: result.users,
					servers: result.guilds,
					shards: client.shard?.count,
					ping: client.ws.ping
				},
				"content": {
					commands: client.commands.size + client.message_commands.size + client.applicationsCommands.size,
					category: client.category.length
				},
				"user": {
					username: client.user?.username,
					tag: client.user?.tag,
					id: client.user?.id,
					discriminator: client.user?.discriminator,
				},
				"misc": {
					ownihrz_instances_length: Object.keys(ownihrz_data || {}).length || 0,
				}
			})
		}

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

		client.player.init({ id: client.user?.id as string, username: 'bot_' + client.user?.id }).then(() => { })
		recoverActiveSessions(client).then(() => { })
		recoverCustomVoiceChannels(client).then(() => { })
		client.memberCountManager.init().then(() => { })
		client.autoRenewManager.init().then(() => { })
		client.nightmodeManager.init().then(() => { })
		client.notifier.start().then(() => { })
		client.infrastructureMonitoring.startMonitoring().then(() => { })

		setInterval(quotesPresence, 120_000), setInterval(refreshSchedule, 15_000)
		if (client.shard?.ids[0] === 0) setInterval(refreshBotData, 45_000);

		fetchInvites(), refreshDatabaseModel(), quotesPresence(), refreshSchedule(), refreshBotData(), statsRefresher();

		PfpsManager_Init(client);

		const initData = getCacheStorage();

		const oldV = initData?._cache.version;
		const newV = client.version.version;

		if (oldV !== newV) {
			const sendingContent = {
				content: "@everyone **New update available !**",
				embeds: [
					new EmbedBuilder()
						.setTimestamp()
						.setURL(`https://gitlab.com/ihrz/ihrz/compare/${oldV}...${newV}`)
						.setTitle(`Click me to see the changelog [${oldV} -> ${newV}]`)
				]
			};

			if (client.version.env !== "dev" && client.version.env !== "production") {
				Array.from(new Set([client.config.owner.ownerid1, client.config.owner.ownerid2])).forEach(async usr => {
					const user = await client.users.fetch(usr);
					sendingContent.content = "**New update available !**"
					user.send(sendingContent).catch(() => false);
				});
			} else {
				const channel_to_send = client.channels.cache.get(initData?._cache.updateChannelId || "00") as BaseGuildTextChannel | undefined;
				channel_to_send?.send(sendingContent).catch(() => false);
			}

			initData._cache.version = newV;
		}

		logger.log(`${client.config.console.emojis.HOST} >> Bot is ready`.white);

		if (client.version.env === "dev") {
			writeFileSync("commands.json", JSON.stringify(client.commands.map(x => {
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
					ephemeral: x.ephemeral,
				}
			}), null, 4))
		}
	},
};

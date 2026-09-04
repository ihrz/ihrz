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

import { Client, EmbedBuilder, Guild } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import logger from "../../core/logger.js";
import { Expressions } from "../../core/functions/randomExpression.js";

const GUILD_DELETE_DELAY = 10 * 60 * 60 * 1000;
const GUILD_DELETE_QUEUE_KEY = "GUILD_DELETE_QUEUE_KEY";
const pendingGuildDeletionTimeouts = new Map<string, Timer>();

type PendingGuildDeletion = {
	guildId: string;
	guildName: string;
	ownerId: string;
	deleteAt: number;
};

type PendingGuildDeletionQueue = Record<string, PendingGuildDeletion>;

let pendingGuildDeletionQueueLock: Promise<void> = Promise.resolve();

async function getPendingGuildDeletionQueue(
	client: Client
): Promise<PendingGuildDeletionQueue> {
	return (
		(await client.db.get<PendingGuildDeletionQueue>(
			GUILD_DELETE_QUEUE_KEY
		)) ?? {}
	);
}

async function updatePendingGuildDeletionQueue<T>(
	client: Client,
	update: (queue: PendingGuildDeletionQueue) => {
		changed: boolean;
		result: T;
	}
): Promise<T> {
	const operation = pendingGuildDeletionQueueLock.then(async () => {
		const queue = await getPendingGuildDeletionQueue(client);
		const { changed, result } = update(queue);
		if (changed) {
			await client.db.set(GUILD_DELETE_QUEUE_KEY, queue);
		}
		return result;
	});

	pendingGuildDeletionQueueLock = operation.then(
		() => {},
		() => {}
	);

	return operation;
}

async function clearGuildData(client: Client, guildId: string) {
	if (client.guilds.cache.has(guildId)) return;

	await client.db.delete(`${guildId}`);
	await updatePendingGuildDeletionQueue(client, (queue) => {
		if (!(guildId in queue)) return { changed: false, result: undefined };
		delete queue[guildId];
		return { changed: true, result: undefined };
	});

	const timeout = pendingGuildDeletionTimeouts.get(guildId);
	if (timeout) clearTimeout(timeout);
	pendingGuildDeletionTimeouts.delete(guildId);
}

function scheduleGuildDataDeletion(
	client: Client,
	pending: PendingGuildDeletion
) {
	const existingTimeout = pendingGuildDeletionTimeouts.get(pending.guildId);
	if (existingTimeout) clearTimeout(existingTimeout);

	const remainingTime = pending.deleteAt - Date.now();

	if (remainingTime <= 0) {
		clearGuildData(client, pending.guildId).catch((error: any) =>
			logger.err(error)
		);
		return;
	}

	pendingGuildDeletionTimeouts.set(
		pending.guildId,
		setTimeout(() => {
			clearGuildData(client, pending.guildId).catch((error: any) =>
				logger.err(error)
			);
		}, remainingTime)
	);
}

async function notifyOwnerFromAnotherGuild(
	client: Client,
	guild: Guild,
	deleteAt: number
) {
	const ownerGuild = client.guilds.cache.find(
		(clientGuild) =>
			clientGuild.id !== guild.id && clientGuild.ownerId === guild.ownerId
	);

	if (!ownerGuild) return;

	const lang = await client.func.getLanguageData(guild.id);
	const owner = await client.users.fetch(guild.ownerId).catch(() => null);
	if (!owner) return;

	const embed = new EmbedBuilder()
		.setColor("#11304c")
		.setTitle(
			lang.guild_leave_data_clear_notice_title.replace(
				"${guild.name}",
				guild.name
			)
		)
		.setDescription(
			lang.guild_leave_data_clear_notice_description
				.replace("${guild.name}", guild.name)
				.replace("${deleteAt}", `<t:${Math.floor(deleteAt / 1000)}:F>`)
		)
		.setTimestamp()
		.setThumbnail(Expressions.Sob)
		.setFooter(await client.func.displayBotName.footerBuilder(guild.id));

	await owner
		.send({
			content: lang.guild_leave_data_clear_notice_message
				.replace("${guild.name}", guild.name)
				.replace("${deleteAt}", `<t:${Math.floor(deleteAt / 1000)}:R>`),
			embeds: [embed]
		})
		.catch(() => {});
}

export async function cancelPendingGuildDataDeletion(
	client: Client,
	guild: Guild
) {
	const pending = await updatePendingGuildDeletionQueue<
		PendingGuildDeletion | undefined
	>(client, (queue) => {
		const pending = queue[guild.id];
		if (!pending) return { changed: false, result: undefined };
		delete queue[guild.id];
		return { changed: true, result: pending };
	});
	if (!pending) return false;

	const timeout = pendingGuildDeletionTimeouts.get(guild.id);
	if (timeout) clearTimeout(timeout);
	pendingGuildDeletionTimeouts.delete(guild.id);

	const lang = await client.func.getLanguageData(guild.id);
	const owner = await client.users.fetch(guild.ownerId).catch(() => null);
	if (!owner) return true;

	const embed = new EmbedBuilder()
		.setColor("#57f287")
		.setTitle(
			lang.guild_leave_data_clear_cancelled_title.replace(
				"${guild.name}",
				guild.name
			)
		)
		.setDescription(
			lang.guild_leave_data_clear_cancelled_description.replace(
				"${guild.name}",
				guild.name
			)
		)
		.setTimestamp()
		.setThumbnail(Expressions.Wink)
		.setFooter(await client.func.displayBotName.footerBuilder(guild.id));

	await owner
		.send({
			content: lang.guild_leave_data_clear_cancelled_message.replace(
				"${guild.name}",
				guild.name
			),
			embeds: [embed]
		})
		.catch(() => {});

	return true;
}

export async function recoverPendingGuildDataDeletions(client: Client) {
	const queue = await getPendingGuildDeletionQueue(client);

	for (const pending of Object.values(queue)) {
		if (!pending?.guildId || !client.inShard(pending.guildId)) continue;

		scheduleGuildDataDeletion(client, pending);
	}
}

export const event: BotEvent = {
	name: "guildDelete",
	run: async (client: Client, guild: Guild) => {
		const deleteAt = Date.now() + GUILD_DELETE_DELAY;
		const pending: PendingGuildDeletion = {
			guildId: guild.id,
			guildName: guild.name,
			ownerId: guild.ownerId,
			deleteAt
		};

		await updatePendingGuildDeletionQueue(client, (queue) => {
			queue[guild.id] = pending;
			return { changed: true, result: undefined };
		});
		scheduleGuildDataDeletion(client, pending);
		await notifyOwnerFromAnotherGuild(client, guild, deleteAt);
	}
};

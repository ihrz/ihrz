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
	BaseGuildTextChannel,
	Client,
	MessageCreateOptions,
	PermissionsBitField,
} from 'discord.js';

import { DatabaseStructure } from '../../../types/database_structure.js';
import { metasTable } from '../../Events/client/ready.js';

import logger from '../logger.js';

type StickyEmbedRecord = DatabaseStructure.DbEmbedObject[string];

export type StickyRefreshStatus =
	| 'sent'
	| 'missing_config'
	| 'missing_embed'
	| 'missing_permissions';

export interface StickyRefreshResult {
	status: StickyRefreshStatus;
	config: DatabaseStructure.StickyChannelConfig | null;
	messageId?: string | null;
}

const stickyRefreshQueue = new Map<string, Promise<StickyRefreshResult>>();
const stickyRefreshTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const STICKY_REFRESH_DELAY = 5_000;

function getStickyQueueKey(guildId: string, channelId: string): string {
	return `${guildId}.${channelId}`;
}

export function getStickyChannelPath(guildId: string, channelId: string): string {
	return `${guildId}.STICKY.${channelId}`;
}

export async function getStickyChannelConfig(
	client: Client,
	guildId: string,
	channelId: string
): Promise<DatabaseStructure.StickyChannelConfig | null> {
	const config = await client.db.get(getStickyChannelPath(guildId, channelId)) as DatabaseStructure.StickyChannelConfig | null;

	if (!config?.enabled) {
		return null;
	}

	return config;
}

export async function deleteStickyChannelMessage(
	channel: BaseGuildTextChannel,
	lastMessageId?: string | null
): Promise<void> {
	if (!lastMessageId) return;

	await channel.messages.delete(lastMessageId).catch((error: unknown) => {
		logger.warn(`Sticky message delete failed for channel ${channel.id}: ${String(error)}`);
	});
}

export async function buildStickyPayload(
	config: DatabaseStructure.StickyChannelConfig
): Promise<MessageCreateOptions | null> {
	const payload: MessageCreateOptions = {};

	if (config.content) {
		payload.content = config.content;
	}

	if (config.embedId) {
		const embed = await metasTable.get(`EMBED.${config.embedId}`) as StickyEmbedRecord | null;

		if (!embed?.embedSource) {
			return null;
		}

		payload.embeds = [embed.embedSource];
	}

	if (!payload.content && !payload.embeds?.length) {
		return null;
	}

	return payload;
}

export async function refreshStickyChannel(
	client: Client,
	channel: BaseGuildTextChannel
): Promise<StickyRefreshResult> {
	const config = await getStickyChannelConfig(client, channel.guild.id, channel.id);

	if (!config) {
		return {
			status: 'missing_config',
			config: null
		};
	}

	if (!channel.permissionsFor(client.user!)?.has(PermissionsBitField.Flags.SendMessages)) {
		logger.warn(`Sticky message send blocked in channel ${channel.id}: missing permission`);
		return {
			status: 'missing_permissions',
			config
		};
	}

	const payload = await buildStickyPayload(config);

	if (!payload) {
		logger.warn(`Sticky message payload missing for channel ${channel.id}: embed source unavailable or payload empty`);
		return {
			status: 'missing_embed',
			config
		};
	}

	await deleteStickyChannelMessage(channel, config.lastMessageId);

	const sentMessage = await channel.send(payload).catch((error: unknown) => {
		logger.warn(`Sticky message send failed for channel ${channel.id}: ${String(error)}`);
		return null;
	});

	if (!sentMessage) {
		return {
			status: 'missing_permissions',
			config
		};
	}

	await client.db.set(`${getStickyChannelPath(channel.guild.id, channel.id)}.lastMessageId`, sentMessage.id);

	return {
		status: 'sent',
		config,
		messageId: sentMessage.id
	};
}

export async function queueStickyChannelRefresh(
	client: Client,
	channel: BaseGuildTextChannel
): Promise<StickyRefreshResult> {
	const queueKey = getStickyQueueKey(channel.guild.id, channel.id);
	const previousTask = stickyRefreshQueue.get(queueKey) || Promise.resolve({
		status: 'missing_config',
		config: null
	} as StickyRefreshResult);

	const nextTask = previousTask
		.catch(() => ({
			status: 'missing_config',
			config: null
		} as StickyRefreshResult))
		.then(() => refreshStickyChannel(client, channel));

	stickyRefreshQueue.set(queueKey, nextTask);

	try {
		return await nextTask;
	} finally {
		if (stickyRefreshQueue.get(queueKey) === nextTask) {
			stickyRefreshQueue.delete(queueKey);
		}
	}
}

export function scheduleStickyChannelRefresh(
	client: Client,
	channel: BaseGuildTextChannel
): void {
	const queueKey = getStickyQueueKey(channel.guild.id, channel.id);
	const existingTimeout = stickyRefreshTimeouts.get(queueKey);

	if (existingTimeout) {
		clearTimeout(existingTimeout);
		stickyRefreshTimeouts.delete(queueKey);
	}

	const nextTimeout = setTimeout(async () => {
		stickyRefreshTimeouts.delete(queueKey);
		await queueStickyChannelRefresh(client, channel);
	}, STICKY_REFRESH_DELAY);

	stickyRefreshTimeouts.set(queueKey, nextTimeout);
}

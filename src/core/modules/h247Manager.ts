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
	BaseGuildVoiceChannel,
	ChannelType,
	Client,
	GatewayOpcodes,
	Guild,
	PermissionFlagsBits
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";

import logger from "../logger.js";
import { isNumber } from "../functions/method.js";
import wait from "../functions/wait.js";

const H247_REJOIN_DELAY_MS = 1_000;
const H247_REJOIN_RETRY_MS = 2_000;
const H247_REJOIN_MAX_ATTEMPTS = 3;
const H247_JOIN_CONFIRM_INTERVAL_MS = 300;
const H247_JOIN_CONFIRM_ATTEMPTS = 8;
const H247_DISCONNECT_OBSERVE_INTERVAL_MS = 500;
const H247_DISCONNECT_OBSERVE_ATTEMPTS = 10;

export async function getH247Data(
	client: Client,
	guildId: string
): Promise<DatabaseStructure.H247Schema | null> {
	return (
		((await client.db.get(`${guildId}.GUILD.H247`)) as
			DatabaseStructure.H247Schema | undefined) ?? null
	);
}

export async function setH247Data(
	client: Client,
	guildId: string,
	data: DatabaseStructure.H247Schema
): Promise<void> {
	await client.db.set(`${guildId}.GUILD.H247`, data);
}

export async function deleteH247Data(
	client: Client,
	guildId: string
): Promise<void> {
	await client.db.delete(`${guildId}.GUILD.H247`);
}

async function fetchH247VoiceChannel(
	guild: Guild,
	voiceChannelId: string
): Promise<BaseGuildVoiceChannel | null> {
	const channel =
		guild.channels.cache.get(voiceChannelId) ??
		(await guild.channels.fetch(voiceChannelId).catch(() => null));

	if (!channel || channel.type !== ChannelType.GuildVoice) return null;

	return channel as BaseGuildVoiceChannel;
}

function sendH247VoiceStateUpdate(
	guild: Guild,
	channelId: string | null
): boolean {
	const shard = guild.shard;

	if (!shard) return false;

	shard.send({
		op: GatewayOpcodes.VoiceStateUpdate,
		d: {
			guild_id: guild.id,
			channel_id: channelId,
			self_deaf: true,
			self_mute: false
		}
	});

	return true;
}

async function waitForH247VoiceConnection(
	guild: Guild,
	voiceChannelId: string
): Promise<boolean> {
	for (let attempt = 0; attempt < H247_JOIN_CONFIRM_ATTEMPTS; attempt++) {
		await wait(H247_JOIN_CONFIRM_INTERVAL_MS);

		if (guild.members.me?.voice.channelId === voiceChannelId) return true;
	}

	return false;
}

async function waitForH247VoiceDisconnection(
	guild: Guild,
	voiceChannelId: string
): Promise<boolean> {
	for (
		let attempt = 0;
		attempt < H247_DISCONNECT_OBSERVE_ATTEMPTS;
		attempt++
	) {
		if (guild.members.me?.voice.channelId !== voiceChannelId) return true;

		await wait(H247_DISCONNECT_OBSERVE_INTERVAL_MS);
	}

	return false;
}

export async function joinH247VoiceChannel(
	guild: Guild,
	voiceChannelId: string,
	confirmConnection: boolean = true
): Promise<boolean> {
	const me = guild.members.me;

	if (!me) return false;

	const channel = await fetchH247VoiceChannel(guild, voiceChannelId);

	if (!channel) return false;

	if (
		!me
			.permissionsIn(channel.id)
			.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])
	) {
		return false;
	}

	if (me.voice.channelId === channel.id) return true;

	const sent = sendH247VoiceStateUpdate(guild, channel.id);

	if (!sent) return false;

	if (!confirmConnection) return true;

	const connected = await waitForH247VoiceConnection(guild, channel.id);

	if (!connected) {
		logger.warn(
			`iHorizon did not receive a voice state for the H24/7 channel ${channel.id} of guild ${guild.id}`
		);
	}

	return connected;
}

export async function leaveCurrentVoiceConnection(guild: Guild): Promise<void> {
	sendH247VoiceStateUpdate(guild, null);
}

export async function recoverH247Sessions(client: Client): Promise<void> {
	const allGuilds = await client.db.all();

	for (const entry of allGuilds) {
		if (!isNumber(entry.id)) continue;
		if (!client.inShard(entry.id)) continue;

		const data = (entry.value as DatabaseStructure.DbInId)?.GUILD?.H247;

		if (!data?.enabled || !data.voiceChannelId) continue;

		const guild = client.guilds.cache.get(entry.id);

		if (!guild) continue;

		await joinH247VoiceChannel(guild, data.voiceChannelId, false);
	}
}

export async function handleH247PlayerDestroyed(
	client: Client,
	guildId: string
): Promise<void> {
	const data = await getH247Data(client, guildId);

	if (!data?.enabled || !data.voiceChannelId) return;

	const guild = client.guilds.cache.get(guildId);

	if (!guild) return;

	for (let attempt = 0; attempt < H247_REJOIN_MAX_ATTEMPTS; attempt++) {
		await wait(attempt === 0 ? H247_REJOIN_DELAY_MS : H247_REJOIN_RETRY_MS);

		if (client.player.getPlayer(guildId)) return;

		// The player always disconnects before "playerDestroy" is emitted,
		// but Discord may still report a stale voice state. Wait until the
		// leave is actually observed before restoring the connection.
		if (
			!(await waitForH247VoiceDisconnection(
				guild,
				data.voiceChannelId
			))
		) {
			return;
		}

		const joined = await joinH247VoiceChannel(guild, data.voiceChannelId);

		if (joined) return;
	}

	logger.warn(
		`Unable to restore the H24/7 voice connection for guild ${guildId} after the player was destroyed`
	);
}

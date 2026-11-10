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
	ChannelType,
	Guild,
	GuildMember,
	PermissionFlagsBits,
	PermissionsBitField,
	Role,
	VoiceChannel
} from "discord.js";
import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import logger from "../logger.js";

// Talk mode and the night-mode derogation: what /util untalk, /util talk and
// /util derogation do, shared with the dashboard actions
// (`gatewayLinkActions/utilities.ts`). Formats: `UTILS.VOICE_TALK`,
// `UTILS.VOICE_TALK_MUTED`, `GUILD.UTILS.DEROGATION`.

/**
 * /util untalk (it ENABLES talk mode, despite its name): server-mutes
 * everyone in the channel but bots, the author, administrators and channel
 * managers, records them, and remembers the channel.
 */
export async function enableTalkMode(
	guild: Guild,
	voiceChannel: VoiceChannel,
	author: GuildMember,
	lang: LanguageData
): Promise<{ mutedCount: number; skippedCount: number }> {
	const client = guild.client;
	const targets = voiceChannel.members.filter(
		(target) => !target.user.bot && target.id !== author.id
	);

	let mutedCount = 0;
	let skippedCount = 0;

	for (const target of targets.values()) {
		if (
			target.permissions.has(PermissionFlagsBits.Administrator) ||
			target.permissions.has(PermissionFlagsBits.ManageChannels)
		) {
			skippedCount++;
			continue;
		}

		try {
			await target.voice.setMute(true, lang.util_talk_audit_reason);
			await client.db.set(
				`${guild.id}.UTILS.VOICE_TALK_MUTED.${target.id}`,
				true
			);
			mutedCount++;
		} catch (error) {
			logger.err(error);
		}
	}

	await client.db.set(`${guild.id}.UTILS.VOICE_TALK`, {
		channelId: voiceChannel.id,
		enabledBy: author.id,
		createdAt: Date.now()
	});

	await client.func.ihorizon_logs(
		{ guild },
		{
			title: lang.util_talk_logs_title,
			description: lang.util_talk_logs_description
				.replace("${author}", author.user.toString())
				.replace("${voiceChannel}", voiceChannel.toString())
				.replace("${mutedCount}", mutedCount.toString())
				.replace("${skippedCount}", skippedCount.toString())
		}
	);

	return { mutedCount, skippedCount };
}

export type TalkOffResult =
	| { ok: true; channel: VoiceChannel; unmutedCount: number }
	| { ok: false; code: "not_in_vc" | "nothing_active" };

/**
 * /util talk (it DISABLES talk mode): unmutes everyone in the talk channel
 * (or `fallback`, the author's channel, when none is recorded) and forgets it.
 */
export async function disableTalkMode(
	guild: Guild,
	fallback: VoiceChannel | null,
	author: GuildMember,
	lang: LanguageData
): Promise<TalkOffResult> {
	const client = guild.client;
	const baseData = (await client.db.get(`${guild.id}.UTILS.VOICE_TALK`)) as {
		channelId?: string;
	} | null;

	if (!baseData?.channelId && !fallback)
		return { ok: false, code: "not_in_vc" };

	const targetChannel = baseData?.channelId
		? guild.channels.cache.get(baseData.channelId) ||
			(await guild.channels.fetch(baseData.channelId).catch(() => null))
		: fallback;

	if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
		await client.db.delete(`${guild.id}.UTILS.VOICE_TALK`);
		return { ok: false, code: "nothing_active" };
	}

	let unmutedCount = 0;

	for (const target of targetChannel.members.values()) {
		if (target.user.bot) continue;

		try {
			await target.voice.setMute(false, lang.util_untalk_audit_reason);
			await client.db.delete(
				`${guild.id}.UTILS.VOICE_TALK_MUTED.${target.id}`
			);
			unmutedCount++;
		} catch (error) {
			logger.err(error);
		}
	}

	await client.db.delete(`${guild.id}.UTILS.VOICE_TALK`);

	await client.func.ihorizon_logs(
		{ guild },
		{
			title: lang.util_untalk_logs_title,
			description: lang.util_untalk_logs_description
				.replace("${author}", author.user.toString())
				.replace("${voiceChannel}", targetChannel.toString())
				.replace("${unmutedCount}", unmutedCount.toString())
		}
	);

	return { ok: true, channel: targetChannel, unmutedCount };
}

export const DEROGATION_ROLE_NAME = "managed by iHorizon";

export type DerogationResult =
	| {
			ok: true;
			role: Role;
			created: boolean;
			missingChannels: number;
			updatedChannels: number;
			failedChannels: number;
	  }
	| { ok: false; code: "bot_missing_perms" };

/**
 * /util derogation: the "managed by iHorizon" role, with every permission but
 * Administrator (night mode only strips Administrator, so it survives the
 * night), created if needed and granted on every channel.
 */
export async function syncDerogation(
	guild: Guild,
	authorTag: string
): Promise<DerogationResult> {
	const client = guild.client;
	if (
		!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) ||
		!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)
	) {
		return { ok: false, code: "bot_missing_perms" };
	}

	const permissions = new PermissionsBitField(PermissionsBitField.All);
	permissions.remove(PermissionFlagsBits.Administrator);

	const baseData = (await client.db.get(
		`${guild.id}.GUILD.UTILS.DEROGATION`
	)) as DatabaseStructure.Derogation | null;

	let role = baseData
		? guild.roles.cache.get(baseData) ||
			(await guild.roles.fetch(baseData).catch(() => null))
		: null;

	let created = false;

	if (!role) {
		role = await guild.roles.create({
			name: DEROGATION_ROLE_NAME,
			permissions,
			reason: `[Utils:Derogation] Created by ${authorTag}`
		});
		created = true;

		await client.db.set(`${guild.id}.GUILD.UTILS.DEROGATION`, role.id);
	} else if (!role.permissions.equals(permissions)) {
		await role.setPermissions(
			permissions,
			`[Utils:Derogation] Sync base permissions requested by ${authorTag}`
		);
	}

	let updatedChannels = 0;
	let failedChannels = 0;
	let missingChannels = 0;

	for (const [, channel] of guild.channels.cache) {
		if (channel.isThread()) continue;

		const overwrite = channel.permissionOverwrites.cache.get(role.id);
		const allowedPermissions = new PermissionsBitField(
			overwrite?.allow.bitfield ?? 0n
		);
		const deniedPermissions = new PermissionsBitField(
			overwrite?.deny.bitfield ?? 0n
		);
		const missingPermissions = permissions
			.toArray()
			.some((permission) => !allowedPermissions.has(permission));
		const hasUnexpectedDeniedPermissions = deniedPermissions
			.toArray()
			.some((permission) => permissions.has(permission));
		const needsSync =
			!overwrite ||
			!allowedPermissions.has(PermissionFlagsBits.ViewChannel) ||
			missingPermissions ||
			hasUnexpectedDeniedPermissions;

		if (!needsSync) continue;

		missingChannels++;

		try {
			await channel.permissionOverwrites.edit(
				role,
				{
					ViewChannel: true,
					...Object.fromEntries(
						permissions
							.toArray()
							.map((permission) => [permission, true])
					)
				},
				{
					reason: `[Utils:Derogation] Sync fake admin perms for ${role.name}`
				}
			);

			updatedChannels++;
		} catch {
			failedChannels++;
		}
	}

	return {
		ok: true,
		role,
		created,
		missingChannels,
		updatedChannels,
		failedChannels
	};
}

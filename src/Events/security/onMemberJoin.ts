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
	SnowflakeUtil,
	Client,
	EmbedBuilder,
	GuildMember,
	GuildTextBasedChannel,
	Message,
	PermissionsBitField
} from "discord.js";

import logger from "../../core/logger.js";
import captcha from "../../core/captcha.js";

import { BotEvent } from "../../../types/event.js";
import { joinRolesToGive } from "../guildconfig/joinRole.js";
import {
	CAPTCHA_TIMEOUT_MS,
	captchaPassed,
	clearCaptchaPending,
	holdArrival,
	markCaptchaPending,
	markRejected
} from "../../core/modules/memberArrival.js";

/**
 * The join roles wait for the captcha, except the role the captcha removes
 * (`/security role-to-remove`) when it is also a join role: that "Pending"
 * role is what opens the verification channel, so it is given now.
 */
export async function givePendingRole(
	client: Client,
	member: GuildMember,
	pendingRole: string | undefined
): Promise<void> {
	if (!pendingRole) return;
	if (
		!member.guild.members.me?.permissions.has(
			PermissionsBitField.Flags.ManageRoles
		)
	)
		return;
	const joinRoles = (await client.db.get(
		`${member.guild.id}.GUILD.GUILD_CONFIG.joinroles`
	)) as string[] | string | null;
	const ids = Array.isArray(joinRoles)
		? joinRoles
		: joinRoles
			? [joinRoles]
			: [];
	if (!ids.includes(pendingRole)) return;
	if (joinRolesToGive(member, [pendingRole]).length === 0) return;
	await member.roles
		.add(pendingRole, "[AutoRole] Assign role for new member")
		.catch(() => null);
}

const MAX_ATTEMPTS = 3;
const COLLECTOR_TIMEOUT_MS = CAPTCHA_TIMEOUT_MS; // 2 min 30 s

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {
		if (!member.guild || member.user.bot) return;

		// The welcome side waits for the captcha (`memberArrival`): held
		// until we know whether this member gets one.
		const release = holdArrival(member);
		try {
			await runCaptcha(client, member);
		} catch (error) {
			// Captcha not posted: welcomed like on a server without one.
			clearCaptchaPending(member);
			logger.warn(`[Security] Captcha error: ${String(error)}`);
		} finally {
			release();
		}
	}
};

async function runCaptcha(client: Client, member: GuildMember): Promise<void> {
	const baseData = await client.db.get(`${member.guild.id}.SECURITY`);
	if (!baseData || baseData?.disable === true) return;

	const data = await client.func.getLanguageData(member.guild.id);
	const channel = member.guild.channels.cache.get(baseData?.channel);
	if (!channel) return;
	markCaptchaPending(member);
	await givePendingRole(client, member, baseData?.role2);
	const { code, image } = await captcha();
	const joinedTimestamp = member.joinedTimestamp;
	const expiresAt = Math.floor((Date.now() + COLLECTOR_TIMEOUT_MS) / 1000);

	const buildContent = (attemptsLeft: number) =>
		[
			data.event_security.replace("${member}", member.toString()),
			"",
			data.event_security_expiry
				.replace("${timestamp}", `<t:${expiresAt}:R>`)
				.replace("${attempts}", attemptsLeft.toString())
				.replace("{emoji}", client.iHorizon_Emojis.Schedule),
			`-# ${data.event_security_footer}`
		].join("\n");

	const nonce = SnowflakeUtil.generate().toString();
	let msg: Message;

	try {
		msg = await (channel as GuildTextBasedChannel).send({
			content: buildContent(MAX_ATTEMPTS),
			files: [{ name: "captcha.png", attachment: image }],
			enforceNonce: true,
			nonce
		});
	} catch (error: unknown) {
		logger.warn(
			`[Security] Captcha send failed in ${member.guild.id}: ${String(error)}`
		);
		// No captcha after all: welcomed like on a server without one.
		clearCaptchaPending(member);
		return;
	}

	let attemptsLeft = MAX_ATTEMPTS;
	let passed = false;

	const collector = (
		msg.channel as GuildTextBasedChannel
	).createMessageCollector({
		filter: (m: Message) => m.author.id === member.id,
		time: COLLECTOR_TIMEOUT_MS
	});

	collector.on("collect", async (m: Message) => {
		await m.delete().catch(() => {});

		if (m.content === code) {
			passed = true;
			collector.stop("passed");
			await member.roles
				.add(baseData?.role, "[Security] Module")
				.catch(() => {});
			await member.roles
				.remove(baseData?.role2, "[Security] Module")
				.catch(() => {});
			await msg.delete().catch(() => {});
			// Now the join roles, role saver, welcome message, join DM…
			await captchaPassed(member, baseData?.role2 ?? null).catch(
				() => {}
			);
			return;
		}

		attemptsLeft--;

		if (attemptsLeft <= 0) {
			collector.stop("failed");
			return;
		}

		await msg.edit({ content: buildContent(attemptsLeft) }).catch(() => {});
	});

	collector.on("end", async () => {
		if (passed) return;

		// Failed, timed out or gone: never welcomed, no leave message.
		markRejected(member);

		// Kick only if this is still the same membership: `joinedAt` is a new
		// Date on every access, so it was never equal and nobody was kicked.
		const current = await member.guild.members
			.fetch({ user: member.id, force: true })
			.catch(() => null);
		if (current && current.joinedTimestamp === joinedTimestamp) {
			await current.kick(data.event_security_kick_reason).catch(() => {});
		}

		await msg.delete().catch(() => {});
	});
}

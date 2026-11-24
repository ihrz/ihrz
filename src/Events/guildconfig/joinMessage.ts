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
	Collection,
	Guild,
	GuildFeature,
	GuildMember,
	Invite,
	PermissionsBitField,
	Vanity
} from "discord.js";
import Jimp from "jimp";
import { fitsDecodeBudget } from "../../core/functions/svgKit.js";
import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { InviteCacheData } from "../../../types/client.js";
import { apiTable } from "../client/ready.js";
import resolveWelcomerEmbed, {
	WelcomerEmbedVariables
} from "../../core/functions/welcomerEmbed.js";
import {
	beginArrival,
	setWelcomeSteps,
	settleArrival,
	WelcomeContext
} from "../../core/modules/memberArrival.js";
import { giveJoinRoles } from "./joinRole.js";
import { sendJoinDm } from "./joinDm.js";
import { ghostPingNewMember } from "./ghostPingModule.js";
import { restoreSavedRoles } from "../rolesaver/onMemberJoin.js";

const INVITE_RESOLVE_TIMEOUT_MS = 1200;

const pendingInviteFetch = new Map<
	string,
	Promise<Collection<string, Invite>>
>();

function fetchInvitesOnce(guild: Guild): Promise<Collection<string, Invite>> {
	const cached = pendingInviteFetch.get(guild.id);
	if (cached) return cached;

	const promise = guild.invites.fetch().finally(() => {
		setTimeout(() => pendingInviteFetch.delete(guild.id), 1500);
	});

	pendingInviteFetch.set(guild.id, promise);
	return promise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return Promise.race([
		promise,
		new Promise<null>((resolve) => {
			setTimeout(() => resolve(null), ms);
		})
	]);
}

async function downscaleAvatar(
	buffer: Buffer,
	avatarSize: string
): Promise<Buffer> {
	try {
		const target = Math.min(
			512,
			Math.max(64, parseInt(avatarSize, 10) || 256)
		);
		if (!fitsDecodeBudget(buffer)) return buffer;
		const image = await Jimp.read(buffer);
		if (image.getWidth() > target) image.resize(target, Jimp.AUTO);
		return await image.getBufferAsync(Jimp.MIME_PNG);
	} catch {
		return buffer;
	}
}

const WELCOME_WIDTH = 1280;
const WELCOME_HEIGHT = 800;
const WELCOME_TEXT_WIDTH = 1160;
const WELCOME_MAX_LINES = 6;

function pixels(value: string, fallback: number, min: number, max: number) {
	const parsed = parseInt(value, 10);
	return Math.min(
		max,
		Math.max(min, Number.isFinite(parsed) ? parsed : fallback)
	);
}

/**
 * Welcome banner, rendered with resvg. Background: the guild/user banner or
 * the configured URL, downloaded through the public-only fetcher (Chromium
 * used to load that admin-supplied URL itself). `<br>` and new lines in the
 * message split lines; everything else is plain text.
 */
export async function generateJoinImage(
	member: GuildMember,
	ImageBannerOptions?: DatabaseStructure.JoinBannerOptions
): Promise<Buffer> {
	const kit = member.client.func.svgKit;

	let backgroundURL =
		(await member.client.func.bannerURL(member.guild, {
			size: 1024,
			extension: "png",
			forceStatic: true
		})) ||
		(await member.client.func.bannerURL(member.user, {
			size: 1024,
			extension: "png",
			forceStatic: true
		})) ||
		"";
	let profilePictureRound = member.displayHexColor;
	let textColour = "#aa9999";
	const [lang, guildLocalRaw] = await Promise.all([
		member.client.func.getLanguageData(member.guild.id),
		member.client.db.get(`${member.guild.id}.GUILD.LANG.lang`)
	]);
	let textMessage = lang.setjoinmessage_image_default_text;
	let textSize = "40px";
	let avatarSize = "140px";

	if (ImageBannerOptions) {
		backgroundURL = ImageBannerOptions.backgroundURL;
		textColour = ImageBannerOptions.textColour;
		textMessage = ImageBannerOptions.message;
		textSize = ImageBannerOptions.textSize;
		avatarSize = ImageBannerOptions.avatarSize;

		if (ImageBannerOptions.profilePictureRound === "status") {
			switch (member.presence?.status) {
				case "dnd":
					profilePictureRound = "#f23f43";
					break;
				case "invisible":
				case "offline":
					profilePictureRound = "#80848e";
					break;
				case "idle":
					profilePictureRound = "#f0b232";
					break;
				case "online":
					profilePictureRound = "#23a55a";
					break;
			}
		}
	}

	const fontSize = pixels(textSize, 40, 12, 96);
	const avatarPx = pixels(avatarSize, 140, 48, 400);
	const lineHeight = Math.round(fontSize * 1.3);

	const message = member.client.func.method.generateCustomMessagePreview(
		textMessage,
		{
			user: member.user,
			guild: member.guild,
			guildLocal: guildLocalRaw || "en-US"
		}
	);
	const style = { size: fontSize, family: "JetBrains Mono" as const };
	const lines = (
		await kit.wrap(
			message.replace(/<br\s*\/?>/gi, "\n"),
			WELCOME_TEXT_WIDTH,
			style,
			WELCOME_MAX_LINES
		)
	).filter((line, index, all) => line || index < all.length - 1);

	// Vertically centered block: avatar, 20px gap, text lines.
	const blockHeight = avatarPx + 20 + lines.length * lineHeight;
	const top = (WELCOME_HEIGHT - blockHeight) / 2;
	const firstBaseline = top + avatarPx + 20 + fontSize;

	const [background, avatar, rendered] = await Promise.all([
		backgroundURL ? kit.fetchImage(backgroundURL) : Promise.resolve(null),
		member.client.func.image64.image64(
			member.displayAvatarURL({
				size: 512,
				extension: "png",
				forceStatic: true
			})
		),
		Promise.all(
			lines.map((line, index) =>
				kit.text(line, {
					...style,
					x: WELCOME_WIDTH / 2,
					y: firstBaseline + index * lineHeight,
					anchor: "middle",
					fill: textColour
				})
			)
		)
	]);

	const svg = kit.fill(member.client.svgfiles["welcomeCard"], {
		// A light veil keeps the text readable on bright backgrounds.
		background: background
			? kit.raw(
					kit.image(background, {
						x: 0,
						y: 0,
						width: WELCOME_WIDTH,
						height: WELCOME_HEIGHT
					}).markup +
						`<rect width="${WELCOME_WIDTH}" height="${WELCOME_HEIGHT}" fill="#000000" opacity="0.35"/>`
				)
			: kit.raw(""),
		avatar: avatar
			? kit.image(await downscaleAvatar(avatar, String(avatarPx)), {
					x: (WELCOME_WIDTH - avatarPx) / 2,
					y: top,
					width: avatarPx,
					height: avatarPx,
					radius: "circle"
				})
			: kit.raw(""),
		avatar_center_y: (top + avatarPx / 2).toFixed(1),
		avatar_ring_radius: (avatarPx / 2 + 2.5).toFixed(1),
		ring_color: profilePictureRound,
		message: kit.raw(
			rendered.map((line: { markup: string }) => line.markup).join("")
		)
	});

	return member.client.func.svg2png(svg);
}

export async function resolveInvite(
	guild: Guild,
	oldInvites: Collection<string, InviteCacheData> | undefined
): Promise<Invite | null> {
	const invites = await fetchInvitesOnce(guild);

	// No snapshot of the counts yet (iHorizon lacked Manage Server or View
	// Audit Log at startup): every invite ever used looked "new", and the
	// first one got the credit. Take the snapshot, credit nobody this time.
	if (!oldInvites) {
		clientInviteCache(guild, invites);
		return null;
	}

	const invite = invites.find((i: Invite) => {
		const oldInvite = oldInvites.get(i.code);
		return i.uses && i.uses > (oldInvite?.uses || 0);
	});

	if (!invite) return null;

	clientInviteCache(guild, invites);
	return invite;
}

function clientInviteCache(guild: Guild, invites: Collection<string, Invite>) {
	guild.client.invites.set(
		guild.id,
		new Collection(
			invites.map((invite) => [
				invite.code,
				{
					uses: invite.uses,
					inviterId: invite.inviterId,
					inviterUsername: invite.inviter?.username || null
				}
			])
		)
	);
}

async function recordInviterStats(
	client: Client,
	guild: Guild,
	member: GuildMember,
	invite: Invite
): Promise<void> {
	const inviterId = invite.inviterId!;

	const check = await client.db.get(`${guild.id}.USER.${inviterId}.INVITES`);

	if (!check) {
		await client.db.set(`${guild.id}.USER.${inviterId}.INVITES`, {
			regular: 0,
			bonus: 0,
			leaves: 0,
			invites: 0
		});
	}

	await client.db.add(`${guild.id}.USER.${inviterId}.INVITES.regular`, 1);
	await client.db.add(`${guild.id}.USER.${inviterId}.INVITES.invites`, 1);

	await client.db.set(`${guild.id}.USER.${member.user.id}.INVITES.BY`, {
		inviter: inviterId,
		invite: invite.code
	});
}

const WELCOME_ACCENT_COLOR = 0x57f287;
const WELCOME_AVATAR_ATTACHMENT_NAME = "welcomer-avatar.png";
const WELCOME_BANNER_ATTACHMENT_NAME = "image.png";

/**
 * Invite tracking, on join (never delayed by the gates or the captcha): the
 * invite used is credited now, and what the welcome message needs to name
 * the inviter is returned, kept with the arrival until the welcome runs.
 */
export async function trackArrivalInvite(
	client: Client,
	member: GuildMember
): Promise<WelcomeContext> {
	if (
		!member.guild.members.me?.permissions.has(
			PermissionsBitField.Flags.ManageGuild
		)
	)
		return {};

	const oldInvites = client.invites.get(member.guild.id);

	let statsRecorded = false;
	const recordStatsOnce = async (resolved: Invite | null) => {
		if (statsRecorded || !resolved?.inviterId) return;
		statsRecorded = true;
		try {
			await recordInviterStats(client, member.guild, member, resolved);
		} catch (e) {
			logger.err(member.guild.name, "Invite stats error: " + e);
		}
	};

	const inviteResultPromise = resolveInvite(member.guild, oldInvites).catch(
		(e) => {
			logger.err(member.guild.name, "Invite resolve error: " + e);
			return null;
		}
	);

	const invite = await withTimeout(
		inviteResultPromise,
		INVITE_RESOLVE_TIMEOUT_MS
	);

	// Resolved too late for the welcome message: still credited.
	inviteResultPromise.then(recordStatsOnce);

	if (invite?.inviterId) {
		await recordStatsOnce(invite);
		const cachedInvite = client.invites
			.get(member.guild.id)
			?.get(invite.code);
		return {
			invite: {
				code: invite.code,
				inviterId: invite.inviterId,
				inviterUsername:
					invite.inviter?.username ||
					cachedInvite?.inviterUsername ||
					null
			}
		};
	}

	// The vanity link is only checked for a welcome message (one request).
	if (!member.guild.features.includes(GuildFeature.VanityURL)) return {};
	const wChan = await client.db.get(
		`${member.guild.id}.GUILD.GUILD_CONFIG.join`
	);
	if (!wChan) return {};

	const VanityURL: Vanity | null = await member.guild
		.fetchVanityData()
		.catch(() => null);
	if (!VanityURL) return {};
	const vanityInviteCache = client.vanityInvites.get(member.guild.id);
	client.vanityInvites.set(member.guild.id, VanityURL);
	if (vanityInviteCache && vanityInviteCache.uses! < VanityURL.uses!) {
		return {
			vanity: { code: VanityURL.code!, uses: VanityURL.uses ?? 0 }
		};
	}
	return {};
}

// Long enough for a gateway retry (svg2png), short enough not to be noticed.
const WELCOME_CARD_TIMEOUT_MS = 12_000;

/** Welcome message and card, part of the welcome side. */
export async function sendWelcomeMessage(
	client: Client,
	member: GuildMember,
	ctx: WelcomeContext
): Promise<void> {
	try {
		if (
			!member.guild.members.me?.permissions.has(
				PermissionsBitField.Flags.ManageGuild
			)
		)
			return;

		const [data, guildLocalRaw, config] = await Promise.all([
			client.func.getLanguageData(member.guild.id),
			client.db.get(`${member.guild.id}.GUILD.LANG.lang`),
			client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG`)
		]);

		const guildLocal = guildLocalRaw || "en-US";
		const {
			joinmessage: joinMessage,
			joinbannerStates: ImageBannerStates,
			join: wChan,
			joinbanner: JoinBannerOptions,
			joinEmbedId,
			joinTextEnabled,
			joinComponentsEnabled
		} = (config ?? {}) as DatabaseStructure.GuildConfigSchema;

		const textEnabled = joinTextEnabled !== false;
		const componentsEnabled = joinComponentsEnabled !== false;

		logger.debug(
			member.guild.name,
			joinMessage,
			JoinBannerOptions,
			wChan,
			ImageBannerStates,
			ctx
		);

		if (!wChan) return;

		const channel =
			member.guild.channels.cache.get(wChan) ||
			(await member.guild.channels.fetch(wChan).catch(() => null));

		if (!channel) return;

		let bannerImage: Buffer | undefined;
		if (ImageBannerStates === "on") {
			try {
				// The welcome never waits on its card: past this, it goes out without it.
				bannerImage =
					(await withTimeout(
						generateJoinImage(member, JoinBannerOptions),
						WELCOME_CARD_TIMEOUT_MS
					)) ?? undefined;
				if (!bannerImage)
					logger.warn(
						`[welcome] card not ready after ${WELCOME_CARD_TIMEOUT_MS} ms in ${member.guild.id}: sent without it`
					);
			} catch (e) {
				logger.err(member.guild.name, "Join image error: " + e);
			}
		}

		async function sendWelcome(
			msg: string,
			variables: WelcomerEmbedVariables
		): Promise<void> {
			const embed = await resolveWelcomerEmbed(joinEmbedId, variables);
			await member.client.func.welcomerMessage(
				channel as BaseGuildTextChannel,
				member,
				{
					message: textEnabled ? msg : null,
					embed,
					useComponents: embed ? false : componentsEnabled,
					accentColor: WELCOME_ACCENT_COLOR,
					avatarAttachmentName: WELCOME_AVATAR_ATTACHMENT_NAME,
					bannerImage,
					bannerAttachmentName: WELCOME_BANNER_ATTACHMENT_NAME
				}
			);
		}

		const variables: WelcomerEmbedVariables = {
			user: member.user,
			guild: member.guild,
			guildLocal: guildLocal
		};

		if (ctx.invite) {
			const { inviterId, code } = ctx.invite;
			const inviterUsername =
				ctx.invite.inviterUsername || `@${inviterId}`;
			const invitesAmount = await client.db.get(
				`${member.guild.id}.USER.${inviterId}.INVITES.invites`
			);

			// Is discord.wf link
			const CustomVanityInvite = await apiTable.get(
				`VANITY.${member.guild.id}`
			);
			const isCustomVanity =
				inviterId === client.user?.id &&
				CustomVanityInvite?.invite === code;

			variables.inviter = {
				user: {
					username: isCustomVanity
						? ".wf/" + CustomVanityInvite.vanity
						: inviterUsername,
					mention: isCustomVanity
						? "discord.wf/" + CustomVanityInvite.vanity
						: `<@${inviterId}>`
				},
				invitesAmount: invitesAmount
			};

			await sendWelcome(
				client.func.method.generateCustomMessagePreview(
					joinMessage || data.event_welcomer_inviter,
					variables
				),
				variables
			);
			return;
		}

		if (ctx.vanity) {
			variables.inviter = {
				user: {
					username: ".gg/" + ctx.vanity.code,
					mention: ctx.vanity.code
				},
				invitesAmount: ctx.vanity.uses
			};
		}

		await sendWelcome(
			client.func.method.generateCustomMessagePreview(
				joinMessage || data.event_welcomer_default,
				variables
			),
			variables
		);
	} catch (error) {
		logger.err(error);
	}
}

setWelcomeSteps({
	roles: [giveJoinRoles, restoreSavedRoles],
	messages: [sendWelcomeMessage, sendJoinDm, ghostPingNewMember]
});

/**
 * The one `guildMemberAdd` handler of the welcome side: credits the invite
 * now, then lets `memberArrival` wait for the gates (and the captcha) before
 * the join roles, role saver, welcome message, join DM and ghost pings.
 */
export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {
		const startedAt = Date.now();
		beginArrival(member);

		let ctx: WelcomeContext = {};
		try {
			ctx = await trackArrivalInvite(client, member);
		} catch (error) {
			logger.err(error);
		}

		try {
			await settleArrival(client, member, ctx, startedAt);
		} catch (error) {
			logger.err(error);
		}
	}
};

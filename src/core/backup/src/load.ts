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

import type {
	AutomodData,
	BackupData,
	ChannelPermissionsData,
	LoadOptions,
	RoleData,
	TextChannelData,
	VoiceChannelData
} from "./types";
import {
	AutoModerationRuleTriggerType,
	ChannelType,
	GuildFeature,
	GuildScheduledEventEntityType,
	StickerFormatType,
	type Guild,
	type GuildBasedChannel,
	type GuildChannelResolvable,
	type GuildScheduledEventCreateOptions,
	type OverwriteData,
	type Role,
	type VoiceChannel
} from "discord.js";
import { buildOverwrites, loadCategory, loadChannel } from "./util";
import { reorderedPositions, type BackupComponent } from "./components";

export type BackupReport = Partial<
	Record<BackupComponent, { ok: number; failed: number }>
>;

const REASON = "[Backup System]";
const MAX_MEMBERS_RESTORED = 2000;

class Tally {
	ok = 0;
	failed = 0;

	async run(label: string, action: () => Promise<unknown>) {
		try {
			await action();
			this.ok++;
		} catch (error) {
			this.failed++;
			logger.err(`Backup restore: ${label}: ${error}`);
		}
	}

	get result() {
		return { ok: this.ok, failed: this.failed };
	}
}

function image(
	base64: string | null | undefined,
	url: string | null | undefined
) {
	if (base64) return Buffer.from(base64, "base64");
	// Backups made before the rewrite stored a hash here, not a URL.
	return url?.startsWith("http") ? url : null;
}

function findChannel(
	guild: Guild,
	name: string | null | undefined,
	types?: readonly ChannelType[]
) {
	return name
		? (guild.channels.cache.find(
				(c) =>
					c.name === name &&
					c.type !== ChannelType.GuildCategory &&
					!c.isThread() &&
					(!types || types.includes(c.type))
			) as (GuildBasedChannel & VoiceChannel) | undefined)
		: undefined;
}

const TEXT_ONLY = [ChannelType.GuildText] as const;

/** Old backups hold an image hash here, unusable without the file. */
function unusableImage(
	base64: string | null | undefined,
	url: string | null | undefined
) {
	return !base64 && !!url && !url.startsWith("http");
}

/** Settings that do not depend on channels. */
async function loadConfig(guild: Guild, data: BackupData, tally: Tally) {
	const { name, verificationLevel, explicitContentFilter } = data;
	await tally.run("name", () => guild.setName(name, REASON));
	if (!unusableImage(data.iconBase64, data.iconURL)) {
		await tally.run("icon", () =>
			guild.setIcon(image(data.iconBase64, data.iconURL), REASON)
		);
	}
	if (
		guild.features.includes(GuildFeature.InviteSplash) &&
		!unusableImage(data.splashBase64, data.splashURL)
	) {
		await tally.run("splash", () =>
			guild.setSplash(image(data.splashBase64, data.splashURL), REASON)
		);
	}
	if (
		guild.features.includes(GuildFeature.Banner) &&
		!unusableImage(data.bannerBase64, data.bannerURL)
	) {
		await tally.run("banner", () =>
			guild.setBanner(image(data.bannerBase64, data.bannerURL), REASON)
		);
	}
	await tally.run("verification level", () =>
		guild.setVerificationLevel(verificationLevel, REASON)
	);
	await tally.run("notifications", () =>
		guild.setDefaultMessageNotifications(
			data.defaultMessageNotifications,
			REASON
		)
	);
	if (guild.features.includes(GuildFeature.Community)) {
		await tally.run("explicit filter", () =>
			guild.setExplicitContentFilter(explicitContentFilter, REASON)
		);
	}
	if (data.version) {
		// One call each: Discord refusing one field must not lose the others.
		const community = guild.features.includes(GuildFeature.Community);
		const fields = {
			...(community
				? {
						description: data.description,
						preferredLocale: data.preferredLocale as never
					}
				: {}),
			premiumProgressBarEnabled: data.premiumProgressBarEnabled,
			systemChannelFlags: data.systemChannelFlags
		};
		for (const [field, value] of Object.entries(fields)) {
			await tally.run(field, () =>
				guild.edit({ [field]: value, reason: REASON })
			);
		}
	}
}

/** Settings that point at channels: they run once channels exist. */
async function loadChannelSettings(
	guild: Guild,
	data: BackupData,
	tally: Tally
) {
	if (data.afk) {
		const afk = data.afk;
		await tally.run("afk", async () => {
			await guild.setAFKChannel(
				guild.channels.cache.find(
					(c) =>
						c.name === afk.name && c.type === ChannelType.GuildVoice
				) as VoiceChannel,
				REASON
			);
			await guild.setAFKTimeout(afk.timeout, REASON);
		});
	}
	if (data.widget.channel || data.widget.enabled) {
		await tally.run("widget", () =>
			guild.setWidgetSettings(
				{
					enabled: data.widget.enabled,
					channel: findChannel(guild, data.widget.channel) ?? null
				},
				REASON
			)
		);
	}
	if (data.systemChannel !== undefined) {
		await tally.run("system channel", () =>
			guild.setSystemChannel(
				(findChannel(guild, data.systemChannel, TEXT_ONLY) ??
					null) as never,
				REASON
			)
		);
	}

	if (!guild.features.includes(GuildFeature.Community)) return;
	const rules = findChannel(guild, data.rulesChannel, TEXT_ONLY);
	if (rules) {
		await tally.run("rules channel", () =>
			guild.setRulesChannel(rules as never, REASON)
		);
	}
	const updates = findChannel(guild, data.publicUpdatesChannel, TEXT_ONLY);
	if (updates) {
		await tally.run("updates channel", () =>
			guild.setPublicUpdatesChannel(updates as never, REASON)
		);
	}
	const safety = findChannel(guild, data.safetyAlertsChannel, TEXT_ONLY);
	if (safety) {
		await tally.run("safety channel", () =>
			guild.edit({ safetyAlertsChannel: safety as never, reason: REASON })
		);
	}
	if (data.welcomeScreen) {
		const screen = data.welcomeScreen;
		await tally.run("welcome screen", () =>
			guild.editWelcomeScreen({
				enabled: screen.enabled,
				description: screen.description ?? undefined,
				welcomeChannels: screen.channels.flatMap((w) => {
					const channel = findChannel(guild, w.channel);
					return channel
						? [
								{
									channel: channel as never,
									description: w.description,
									emoji: w.emoji ?? undefined
								}
							]
						: [];
				})
			})
		);
	}
}

function roleOptions(guild: Guild, role: RoleData) {
	const enhanced = guild.features.includes(
		"ENHANCED_ROLE_COLORS" as GuildFeature
	);
	const hasIcons = guild.features.includes(GuildFeature.RoleIcons);
	return {
		name: role.name,
		colors: {
			primaryColor: role.colors?.primaryColor ?? (role.color as never),
			...(enhanced && role.colors?.secondaryColor
				? { secondaryColor: role.colors.secondaryColor }
				: {}),
			...(enhanced && role.colors?.tertiaryColor
				? { tertiaryColor: role.colors.tertiaryColor }
				: {})
		},
		hoist: role.hoist,
		permissions: BigInt(role.permissions),
		mentionable: role.mentionable,
		reason: REASON,
		...(hasIcons && role.iconBase64
			? { icon: Buffer.from(role.iconBase64, "base64") }
			: {}),
		...(hasIcons && role.unicodeEmoji
			? { unicodeEmoji: role.unicodeEmoji }
			: {})
	};
}

/**
 * Roles are matched by name and edited: recreating one gives it a new id,
 * which strips it from every member.
 */
async function loadRoles(guild: Guild, data: BackupData, tally: Tally) {
	const used = new Set<string>();
	const restored: Role[] = [];

	// One at a time, highest first: each new role lands under the previous.
	for (const role of data.roles) {
		await tally.run(`role ${role.name}`, async () => {
			if (role.isEveryone) {
				await guild.roles.everyone.edit({
					permissions: BigInt(role.permissions),
					mentionable: role.mentionable,
					reason: REASON
				});
				return;
			}
			const existing = guild.roles.cache.find(
				(r) =>
					r.name === role.name &&
					r.id !== guild.id &&
					!r.managed &&
					!used.has(r.id)
			);
			if (existing) {
				used.add(existing.id);
				// Above the bot: Discord would refuse, and it is already there.
				if (!existing.editable) return;
				restored.push(await existing.edit(roleOptions(guild, role)));
				return;
			}
			const created = await guild.roles.create(roleOptions(guild, role));
			used.add(created.id);
			restored.push(created);
		});
	}

	const positions = reorderedPositions(
		[...guild.roles.cache.values()].map((r) => ({
			id: r.id,
			position: r.position
		})),
		restored.map((r) => r.id)
	);
	if (positions.length) {
		await tally.run("role order", () =>
			guild.roles.setPositions(positions)
		);
	}
}

async function loadChannels(
	guild: Guild,
	data: BackupData,
	components: BackupComponent[],
	options: LoadOptions,
	tally: Tally
) {
	const channelOptions: LoadOptions = {
		...options,
		components,
		maxMessagesPerChannel: components.includes("messages")
			? options.maxMessagesPerChannel
			: 0
	};
	const load = async (
		channel: TextChannelData | VoiceChannelData,
		parent: Awaited<ReturnType<typeof loadCategory>> | null
	) =>
		tally.run(`channel ${channel.name}`, () =>
			loadChannel(channel, guild, parent, channelOptions)
		);

	for (const category of data.channels.categories) {
		let created: Awaited<ReturnType<typeof loadCategory>> | null = null;
		await tally.run(`category ${category.name}`, async () => {
			created = await loadCategory(category, guild, channelOptions);
		});
		for (const child of category.children) await load(child, created);
	}
	for (const channel of data.channels.others) await load(channel, null);
}

/** Restores overwrites on channels that still exist, matched by name. */
async function loadPermissionsOnly(
	guild: Guild,
	data: BackupData,
	tally: Tally
) {
	const entries: {
		name: string;
		type: unknown;
		parent: string | null;
		permissions: ChannelPermissionsData[];
	}[] = [
		...data.channels.categories.map((c) => ({
			name: c.name,
			type: ChannelType.GuildCategory,
			parent: null,
			permissions: c.permissions
		})),
		...[
			...data.channels.categories.flatMap((c) => c.children),
			...data.channels.others
		].map((c) => ({
			name: c.name,
			type: c.type,
			parent: c.parent ?? null,
			permissions: c.permissions
		}))
	];

	// Same name is not enough: two "chat" channels would swap their access.
	const used = new Set<string>();
	for (const entry of entries) {
		const channel = guild.channels.cache.find(
			(c) =>
				!used.has(c.id) &&
				!c.isThread() &&
				c.name === entry.name &&
				c.type === entry.type &&
				(c.parent?.name ?? null) === entry.parent
		);
		if (!channel || !("permissionOverwrites" in channel)) continue;
		used.add(channel.id);
		await tally.run(`permissions of ${entry.name}`, async () => {
			const overwrites: OverwriteData[] = await buildOverwrites(
				entry.permissions,
				guild
			);
			await channel.permissionOverwrites.set(overwrites, REASON);
		});
	}
}

async function loadEmojis(guild: Guild, data: BackupData, tally: Tally) {
	for (const emoji of data.emojis) {
		const attachment = emoji.base64
			? Buffer.from(emoji.base64, "base64")
			: emoji.url;
		if (!attachment) continue;
		await tally.run(`emoji ${emoji.name}`, () =>
			guild.emojis.create({
				name: emoji.name!,
				attachment,
				reason: REASON
			})
		);
	}
}

async function loadStickers(guild: Guild, data: BackupData, tally: Tally) {
	for (const sticker of data.stickers ?? []) {
		const extension =
			sticker.format === StickerFormatType.GIF ? "gif" : "png";
		await tally.run(`sticker ${sticker.name}`, () =>
			guild.stickers.create({
				file: {
					attachment: Buffer.from(sticker.base64, "base64"),
					name: `sticker.${extension}`
				},
				name: sticker.name,
				tags: sticker.tags || sticker.name,
				description: sticker.description ?? undefined,
				reason: REASON
			})
		);
	}
}

async function loadBans(guild: Guild, data: BackupData, tally: Tally) {
	for (const ban of data.bans) {
		await tally.run(`ban ${ban.id}`, () =>
			guild.members.ban(ban.id, { reason: ban.reason || REASON })
		);
	}
}

function automodMetadata(rule: AutomodData) {
	const m = rule.triggerMetadata;
	switch (rule.triggerType) {
		case AutoModerationRuleTriggerType.Keyword:
		case AutoModerationRuleTriggerType.MemberProfile:
			return {
				keywordFilter: m.keywordFilter,
				regexPatterns: m.regexPatterns,
				allowList: m.allowList
			};
		case AutoModerationRuleTriggerType.KeywordPreset:
			return { presets: m.presets, allowList: m.allowList };
		case AutoModerationRuleTriggerType.MentionSpam:
			return {
				mentionTotalLimit: m.mentionTotalLimit ?? undefined,
				mentionRaidProtectionEnabled: m.mentionRaidProtectionEnabled
			};
		default:
			return undefined;
	}
}

function automodOptions(guild: Guild, rule: AutomodData) {
	const ids = (items: { id: string; name: string }[], names: string[]) =>
		names.flatMap((name) => {
			const id = items.find((item) => item.name === name)?.id;
			return id ? [id] : [];
		});
	return {
		name: rule.name,
		eventType: rule.eventType,
		triggerType: rule.triggerType,
		triggerMetadata: automodMetadata(rule),
		actions: rule.actions.map((action) => ({
			type: action.type,
			metadata: {
				channel: action.channel
					? (findChannel(
							guild,
							action.channel
						) as GuildChannelResolvable)
					: undefined,
				durationSeconds: action.durationSeconds ?? undefined,
				customMessage: action.customMessage ?? undefined
			}
		})),
		enabled: rule.enabled,
		exemptRoles: ids([...guild.roles.cache.values()], rule.exemptRoles),
		exemptChannels: ids(
			[...guild.channels.cache.values()],
			rule.exemptChannels
		),
		reason: REASON
	};
}

async function loadAutomod(guild: Guild, data: BackupData, tally: Tally) {
	for (const rule of data.automod ?? []) {
		await tally.run(`automod ${rule.name}`, () =>
			guild.autoModerationRules.create(
				automodOptions(guild, rule) as never
			)
		);
	}
}

async function loadEvents(guild: Guild, data: BackupData, tally: Tally) {
	const existing = await guild.scheduledEvents.fetch().catch(() => null);
	for (const event of data.events ?? []) {
		// Discord refuses an event in the past.
		if (event.start <= Date.now()) continue;
		if (
			existing?.some(
				(e) =>
					e.name === event.name &&
					e.scheduledStartTimestamp === event.start
			)
		)
			continue;
		const external =
			event.entityType === GuildScheduledEventEntityType.External;
		await tally.run(`event ${event.name}`, () =>
			guild.scheduledEvents.create({
				name: event.name,
				description: event.description ?? undefined,
				scheduledStartTime: event.start,
				scheduledEndTime: event.end ?? undefined,
				privacyLevel: event.privacyLevel,
				entityType: event.entityType,
				channel: external
					? undefined
					: (findChannel(guild, event.channel) as never),
				entityMetadata: external
					? { location: event.location ?? "" }
					: undefined,
				reason: REASON
			} as GuildScheduledEventCreateOptions)
		);
	}
}

async function loadMembers(guild: Guild, data: BackupData, tally: Tally) {
	// Old backups list role ids, which do not survive a restore.
	if (!data.version) return;
	const present = await guild.members
		.fetch()
		.catch(() => guild.members.cache);
	const saved = data.members
		.filter((m) => present.has(m.userId))
		.slice(0, MAX_MEMBERS_RESTORED);

	for (const entry of saved) {
		const member = present.get(entry.userId)!;
		const roles = entry.roles.flatMap((name) => {
			const role = guild.roles.cache.find(
				(r) => r.name === name && r.editable
			);
			return role ? [role.id] : [];
		});
		const kept = member.roles.cache
			.filter((r) => r.id !== guild.id && !r.editable)
			.map((r) => r.id);
		await tally.run(`member ${entry.userId}`, () =>
			member.edit({
				roles: [...new Set([...kept, ...roles])],
				...(member.manageable && entry.nickname !== undefined
					? { nick: entry.nickname }
					: {}),
				reason: REASON
			})
		);
	}
}

/** Runs the selected stages in dependency order; one failure never aborts. */
export async function restore(
	guild: Guild,
	data: BackupData,
	components: BackupComponent[],
	options: LoadOptions
): Promise<BackupReport> {
	const has = (c: BackupComponent) => components.includes(c);
	const report: BackupReport = {};
	const stage = async (
		component: BackupComponent,
		run: (tally: Tally) => Promise<void>
	) => {
		const tally = new Tally();
		await run(tally);
		report[component] = {
			ok: tally.ok + (report[component]?.ok ?? 0),
			failed: tally.failed + (report[component]?.failed ?? 0)
		};
	};

	if (has("settings"))
		await stage("settings", (t) => loadConfig(guild, data, t));
	if (has("roles")) {
		await stage("roles", (t) => loadRoles(guild, data, t));
	}
	if (has("channels")) {
		await stage("channels", (t) =>
			loadChannels(guild, data, components, options, t)
		);
	} else if (has("permissions")) {
		await stage("permissions", (t) => loadPermissionsOnly(guild, data, t));
	}
	if (has("settings")) {
		await stage("settings", (t) => loadChannelSettings(guild, data, t));
	}
	if (has("emojis")) await stage("emojis", (t) => loadEmojis(guild, data, t));
	if (has("stickers")) {
		await stage("stickers", (t) => loadStickers(guild, data, t));
	}
	if (has("bans")) await stage("bans", (t) => loadBans(guild, data, t));
	if (has("automod"))
		await stage("automod", (t) => loadAutomod(guild, data, t));
	if (has("events")) await stage("events", (t) => loadEvents(guild, data, t));
	if (has("members"))
		await stage("members", (t) => loadMembers(guild, data, t));
	return report;
}

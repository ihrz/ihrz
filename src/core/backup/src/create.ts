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
	BanData,
	CategoryData,
	ChannelsData,
	CreateOptions,
	EmojiData,
	EventData,
	RoleData,
	StickerData,
	TextChannelData,
	VoiceChannelData
} from "./types";
import {
	fetchChannelPermissions,
	fetchTextChannelData,
	fetchVoiceChannelData,
	fetchStageChannelData
} from "./util";
import { MemberData } from "./types/MemberData";
import {
	type GuildBasedChannel,
	type Guild,
	type Snowflake,
	type StageChannel,
	type TextChannel,
	type VoiceChannel,
	ChannelType,
	GuildFeature,
	StickerFormatType
} from "discord.js";

async function toBase64(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status} on ${url}`);
	return Buffer.from(await response.arrayBuffer()).toString("base64");
}

async function imageFields(
	key: "icon" | "splash" | "banner",
	url: string | null | undefined,
	saveImages: boolean | null | undefined
): Promise<Partial<BackupData>> {
	if (!url) return {};
	const fields: Partial<BackupData> = { [`${key}URL`]: url };
	if (saveImages) {
		try {
			fields[`${key}Base64`] = await toBase64(url);
		} catch (error) {
			logger.err(`Backup: cannot read the server ${key}: ${error}`);
		}
	}
	return fields;
}

export async function getSettings(
	guild: Guild,
	options: CreateOptions
): Promise<Partial<BackupData>> {
	const size = 4096 as const;
	const data: Partial<BackupData> = {
		description: guild.description,
		preferredLocale: guild.preferredLocale,
		premiumProgressBarEnabled: guild.premiumProgressBarEnabled,
		systemChannelFlags: guild.systemChannelFlags.bitfield,
		systemChannel: guild.systemChannel?.name ?? null,
		rulesChannel: guild.rulesChannel?.name ?? null,
		publicUpdatesChannel: guild.publicUpdatesChannel?.name ?? null,
		safetyAlertsChannel: guild.safetyAlertsChannel?.name ?? null,
		afk: guild.afkChannel
			? { name: guild.afkChannel.name, timeout: guild.afkTimeout }
			: null,
		widget: {
			enabled: guild.widgetEnabled || false,
			channel: guild.widgetChannel ? guild.widgetChannel.name : null
		},
		...(await imageFields(
			"icon",
			guild.iconURL({ size }),
			options.saveImages
		)),
		...(await imageFields(
			"splash",
			guild.splashURL({ size, extension: "png" }),
			options.saveImages
		)),
		...(await imageFields(
			"banner",
			guild.bannerURL({ size }),
			options.saveImages
		))
	};

	if (guild.features.includes(GuildFeature.Community)) {
		const screen = await guild.fetchWelcomeScreen().catch(() => null);
		if (screen) {
			data.welcomeScreen = {
				enabled: screen.enabled,
				description: screen.description,
				channels: screen.welcomeChannels.map((w) => ({
					channel: w.channel?.name ?? "",
					description: w.description ?? "",
					// A custom emoji belongs to the old server.
					emoji: w.emoji && !w.emoji.id ? w.emoji.name : null
				}))
			};
		}
	}
	return data;
}

export async function getBans(guild: Guild): Promise<BanData[]> {
	const bans: BanData[] = [];
	let after: Snowflake | undefined;
	for (;;) {
		const page = await guild.bans.fetch({
			limit: 1000,
			cache: false,
			...(after ? { after } : {})
		});
		for (const ban of page.values()) {
			bans.push({ id: ban.user.id, reason: ban.reason });
		}
		if (page.size < 1000) return bans;
		after = page.lastKey();
	}
}

export async function getMembers(guild: Guild): Promise<MemberData[]> {
	const members = await guild.members.fetch();
	return members
		.filter((member) => !member.user.bot)
		.map((member) => ({
			userId: member.user.id,
			username: member.user.username,
			discriminator: member.user.discriminator,
			avatarUrl: member.user.avatarURL(),
			joinedTimestamp: member.joinedTimestamp,
			nickname: member.nickname,
			// Ids change when roles are recreated: names are the stable key.
			roles: member.roles.cache
				.filter((r) => r.id !== guild.id && !r.managed)
				.map((r) => r.name),
			bot: member.user.bot
		}));
}

export async function getRoles(guild: Guild): Promise<RoleData[]> {
	const roles = [...guild.roles.cache.values()]
		.filter((role) => !role.managed)
		.sort((a, b) => b.position - a.position);

	return Promise.all(
		roles.map(async (role) => {
			const iconUrl = role.icon
				? role.iconURL({ extension: "png", size: 256 })
				: null;
			const data: RoleData = {
				name: role.name,
				color: role.hexColor,
				colors: {
					primaryColor: role.colors.primaryColor,
					secondaryColor: role.colors.secondaryColor,
					tertiaryColor: role.colors.tertiaryColor
				},
				hoist: role.hoist,
				permissions: role.permissions.bitfield.toString(),
				mentionable: role.mentionable,
				position: role.position,
				isEveryone: guild.id === role.id,
				unicodeEmoji: role.unicodeEmoji
			};
			if (iconUrl) {
				data.iconBase64 = await toBase64(iconUrl).catch(
					() => undefined
				);
			}
			return data;
		})
	);
}

export async function getEmojis(
	guild: Guild,
	options: CreateOptions
): Promise<EmojiData[]> {
	return Promise.all(
		guild.emojis.cache.map(async (emoji) => {
			const url = emoji.imageURL({ size: 4096 });
			const data: EmojiData = { name: emoji.name };
			if (options.saveImages) {
				const base64 = await toBase64(url).catch(() => undefined);
				if (base64) data.base64 = base64;
				else data.url = url;
			} else {
				data.url = url;
			}
			return data;
		})
	);
}

export async function getStickers(guild: Guild): Promise<StickerData[]> {
	const stickers = await guild.stickers.fetch();
	const saved: StickerData[] = [];
	for (const sticker of stickers.values()) {
		// Lottie stickers can only be uploaded by Discord partners.
		if (sticker.format === StickerFormatType.Lottie) continue;
		// A sticker left out would be deleted by the restore and never return.
		const base64 = await toBase64(sticker.url);
		saved.push({
			name: sticker.name,
			description: sticker.description,
			tags: sticker.tags ?? "",
			format: sticker.format,
			base64
		});
	}
	return saved;
}

export async function getAutomod(guild: Guild): Promise<AutomodData[]> {
	const rules = await guild.autoModerationRules.fetch();
	const roleName = (id: string) => guild.roles.cache.get(id)?.name;
	const channelName = (id: string) => guild.channels.cache.get(id)?.name;
	const known = (name: string | undefined): name is string => !!name;

	return rules.map((rule) => ({
		name: rule.name,
		eventType: rule.eventType,
		triggerType: rule.triggerType,
		triggerMetadata: {
			keywordFilter: [...rule.triggerMetadata.keywordFilter],
			regexPatterns: [...rule.triggerMetadata.regexPatterns],
			presets: [...rule.triggerMetadata.presets],
			allowList: [...rule.triggerMetadata.allowList],
			mentionTotalLimit: rule.triggerMetadata.mentionTotalLimit,
			mentionRaidProtectionEnabled:
				rule.triggerMetadata.mentionRaidProtectionEnabled
		},
		actions: rule.actions.map((action) => ({
			type: action.type,
			channel: action.metadata.channelId
				? (channelName(action.metadata.channelId) ?? null)
				: null,
			durationSeconds: action.metadata.durationSeconds,
			customMessage: action.metadata.customMessage
		})),
		enabled: rule.enabled,
		exemptRoles: rule.exemptRoles.map((r) => roleName(r.id)).filter(known),
		exemptChannels: rule.exemptChannels
			.map((c) => channelName(c.id))
			.filter(known)
	}));
}

export async function getEvents(guild: Guild): Promise<EventData[]> {
	const events = await guild.scheduledEvents.fetch();
	return events.map((event) => ({
		name: event.name,
		description: event.description,
		start: event.scheduledStartTimestamp ?? 0,
		end: event.scheduledEndTimestamp,
		entityType: event.entityType,
		privacyLevel: event.privacyLevel,
		channel: event.channel?.name ?? null,
		location: event.entityMetadata?.location ?? null
	}));
}

const COMMUNITY_ROLES = [
	["rules", "rulesChannelId"],
	["publicUpdates", "publicUpdatesChannelId"],
	["safetyAlerts", "safetyAlertsChannelId"]
] as const;

async function channelData(
	channel: GuildBasedChannel,
	guild: Guild,
	options: CreateOptions
): Promise<TextChannelData | VoiceChannelData> {
	switch (channel.type) {
		case ChannelType.GuildText:
		case ChannelType.GuildAnnouncement:
		case ChannelType.GuildForum:
		case ChannelType.GuildMedia: {
			const data = await fetchTextChannelData(
				channel as unknown as TextChannel,
				options
			);
			const role = COMMUNITY_ROLES.find(
				([, key]) => guild[key] === channel.id
			);
			if (role) data.communityRole = role[0];
			return data;
		}
		case ChannelType.GuildStageVoice:
			return fetchStageChannelData(channel as StageChannel, options);
		default:
			return fetchVoiceChannelData(channel as VoiceChannel, options);
	}
}

const position = (c: GuildBasedChannel) =>
	"position" in c ? (c.position as number) : 0;

export async function getChannels(
	guild: Guild,
	options: CreateOptions
): Promise<ChannelsData> {
	const channels: ChannelsData = { categories: [], others: [] };
	const all = [...guild.channels.cache.values()].filter((c) => !c.isThread());
	const sorted = (list: GuildBasedChannel[]) =>
		[...list].sort((a, b) => position(a) - position(b));

	for (const category of sorted(
		all.filter((c) => c.type === ChannelType.GuildCategory)
	)) {
		const data: CategoryData = {
			name: category.name,
			permissions: fetchChannelPermissions(category as never, options),
			children: []
		};
		for (const child of sorted(
			all.filter((c) => c.parentId === category.id)
		)) {
			data.children.push(await channelData(child, guild, options));
		}
		channels.categories.push(data);
	}

	for (const channel of sorted(
		all.filter((c) => !c.parentId && c.type !== ChannelType.GuildCategory)
	)) {
		channels.others.push(await channelData(channel, guild, options));
	}
	return channels;
}

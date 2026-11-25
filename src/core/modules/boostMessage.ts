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
	APIEmbed,
	ChannelType,
	Guild,
	GuildMember,
	PermissionFlagsBits,
	User
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";
import { generateCustomMessagePreview } from "../functions/method/messages.js";
import resolveWelcomerEmbed from "../functions/welcomerEmbed.js";

export type BoostKind = "boost" | "unboost";

/** A new boost older than this is a replayed update, not a boost. */
export const MAX_RECENT_BOOST_DELAY_MS = 10 * 60 * 1000;

/** Message text and embed strings: content limit of Discord. */
export const BOOST_MESSAGE_MAX_LENGTH = 2000;

/**
 * Variables of the boost message (`GUILD.BOOST_MESSAGE.*.message` and the
 * embed's strings). The member ones are those of the welcomer
 * (`generateCustomMessagePreview`); the boost ones are replaced first.
 */
export const BOOST_MESSAGE_VARS = [
	"{memberMention}",
	"{memberUsername}",
	"{memberCount}",
	"{guildName}",
	"{createdAt}",
	"{accountCreationTimestamp}",
	"{boostCount}",
	"{boostTier}"
] as const;

interface PremiumState {
	partial: boolean;
	premiumSince: Date | null;
	premiumSinceTimestamp: number | null;
}

function premiumSinceOf(member: PremiumState): number | null {
	return member.partial
		? (member.premiumSinceTimestamp ?? null)
		: (member.premiumSince?.getTime() ?? null);
}

/**
 * What a `guildMemberUpdate` says about boosting (shared with the boost
 * logs): "boost" when the member had no boost and now has a recent one
 * (≤ 10 min, an old boost is a replayed update), "unboost" when the boost
 * is gone, null otherwise.
 */
export function boostChange(
	oldMember: PremiumState,
	newMember: PremiumState,
	now: number = Date.now()
): BoostKind | null {
	const oldPremiumSince = premiumSinceOf(oldMember);
	const newPremiumSince = premiumSinceOf(newMember);
	if (oldPremiumSince === newPremiumSince) return null;

	const isRecentBoost =
		newPremiumSince !== null &&
		now - newPremiumSince <= MAX_RECENT_BOOST_DELAY_MS;

	if (!oldPremiumSince && newPremiumSince && isRecentBoost) return "boost";
	if (oldPremiumSince && !newPremiumSince) return "unboost";
	return null;
}

/** {boostCount} and {boostTier}, before the member variables. */
export function applyBoostVariables(
	text: string,
	guild: Pick<Guild, "premiumSubscriptionCount" | "premiumTier">
): string {
	return text
		.replaceAll("{boostCount}", String(guild.premiumSubscriptionCount ?? 0))
		.replaceAll("{boostTier}", String(guild.premiumTier ?? 0));
}

export interface BoostTextInput {
	guild: Guild;
	user: User;
	guildLocal: string;
}

/** Every variable of `BOOST_MESSAGE_VARS` replaced. */
export function renderBoostText(text: string, input: BoostTextInput): string {
	return generateCustomMessagePreview(
		applyBoostVariables(text, input.guild),
		input
	);
}

export interface BoostMessagePlan {
	/** Text part sent (textEnabled false only counts with an embed). */
	sendText: boolean;
	/** No custom text: the translated default one. */
	useDefaultText: boolean;
	channelId: string | null;
	dm: boolean;
}

export function planBoostMessage(
	side: DatabaseStructure.BoostMessageSide,
	hasEmbed: boolean
): BoostMessagePlan {
	return {
		sendText: side.textEnabled !== false || !hasEmbed,
		useDefaultText: !side.message?.trim(),
		channelId: side.channelId || null,
		dm: side.dm === true
	};
}

export function defaultBoostText(lang: LanguageData, kind: BoostKind): string {
	return kind === "boost"
		? lang.boostmsg_default_boost
		: lang.boostmsg_default_unboost;
}

export interface BoostPayload {
	content?: string;
	embeds?: APIEmbed[];
	allowedMentions: { parse: []; users: string[] };
}

/** Only the member can be pinged, never roles or @everyone. */
export function composeBoostPayload(parts: {
	memberId: string;
	text: string | null;
	embed: APIEmbed | null;
	testTag?: string | null;
}): BoostPayload | null {
	const content = [parts.testTag, parts.text]
		.filter((part): part is string => !!part)
		.join("\n")
		.slice(0, BOOST_MESSAGE_MAX_LENGTH);

	if (!content && !parts.embed) return null;
	return {
		content: content || undefined,
		embeds: parts.embed ? [parts.embed] : undefined,
		allowedMentions: { parse: [], users: [parts.memberId] }
	};
}

/** The real payload for `member` (null when there is nothing to send). */
export async function buildBoostPayload(
	member: GuildMember,
	kind: BoostKind,
	side: DatabaseStructure.BoostMessageSide,
	lang: LanguageData,
	guildLocal: string,
	testTag?: string | null
): Promise<{ payload: BoostPayload | null; plan: BoostMessagePlan }> {
	const input: BoostTextInput = {
		guild: member.guild,
		user: member.user,
		guildLocal
	};
	const embed = await resolveWelcomerEmbed(side.embedId, input, (value) =>
		applyBoostVariables(value, member.guild)
	);
	const plan = planBoostMessage(side, !!embed);
	const text = plan.sendText
		? renderBoostText(
				plan.useDefaultText
					? defaultBoostText(lang, kind)
					: side.message!,
				input
			)
		: null;

	return {
		payload: composeBoostPayload({
			memberId: member.id,
			text,
			embed,
			testTag
		}),
		plan
	};
}

export type DeliveryResult = "ok" | "failed" | "skipped" | null;

export const BOOST_CHANNEL_TYPES = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement
] as const;

/**
 * Posts in the configured channel (when the bot can send there) and/or
 * DMs the member (closed DMs ignored). null = target not configured.
 */
export async function deliverBoostMessage(
	member: GuildMember,
	payload: BoostPayload,
	plan: BoostMessagePlan
): Promise<{ channel: DeliveryResult; dm: DeliveryResult }> {
	const result: { channel: DeliveryResult; dm: DeliveryResult } = {
		channel: null,
		dm: null
	};

	if (plan.channelId) {
		const channel =
			member.guild.channels.cache.get(plan.channelId) ??
			(await member.guild.channels
				.fetch(plan.channelId)
				.catch(() => null));
		const me = member.guild.members.me;
		const needed = [
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages,
			...(payload.embeds ? [PermissionFlagsBits.EmbedLinks] : [])
		];

		if (
			!channel ||
			!(BOOST_CHANNEL_TYPES as readonly ChannelType[]).includes(
				channel.type
			) ||
			!me ||
			!channel.permissionsFor(me)?.has(needed) ||
			!channel.isSendable()
		) {
			logger.warn(
				`[boost-message] cannot post in ${plan.channelId} (${member.guild.id}): skipped`
			);
			result.channel = "skipped";
		} else {
			result.channel = await channel
				.send(payload)
				.then(() => "ok" as const)
				.catch((error) => {
					logger.warn(
						`[boost-message] post failed in ${plan.channelId} (${member.guild.id}): ${error}`
					);
					return "failed" as const;
				});
		}
	}

	if (plan.dm) {
		result.dm = await member
			.send(payload)
			.then(() => "ok" as const)
			.catch(() => "failed" as const);
	}

	return result;
}

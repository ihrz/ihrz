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
	AutoModerationActionOptions,
	AutoModerationActionType,
	AutoModerationRule,
	AutoModerationRuleEventType,
	AutoModerationRuleTriggerType,
	AutoModerationTriggerMetadataOptions,
	Guild
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";

// The native Discord AutoMod rules behind /automod and the dashboard.

export const DEFAULT_MENTION_LIMIT = 3;
const AUTOMOD_CUSTOM_MESSAGE = "This message was prevented by iHorizon";

const SPAM_RULE_NAME = "Block spam by iHorizon";
const MENTION_RULE_NAME = "Block mass-mention spam by iHorizon";
const LEGACY_AD_RULE_NAME = "Block advertissement message by iHorizon";
const TELEGRAM_RULE_NAME = "Block Telegram links by iHorizon";

export type AutomodRuleKey =
	"spam" | "mass_mention" | "antipub" | "media" | "telegram";

export const RULE_ORDER: AutomodRuleKey[] = [
	"spam",
	"mass_mention",
	"antipub",
	"media",
	"telegram"
];

// Regex sets are the exact ones used by the former /automod block commands,
// so every rule keeps the same native AutoMod behaviour behind the panel.
const ANTIPUB_REGEX_PATTERNS: RegExp[] = [
	/(discord\.gg\/|\.gg\/|gg\/|https?:\/\/|http?:\/\/)/i,
	/(?:%[0-9a-fA-F]{2})+/i,
	/(?:<.*?>)?\s*https?:\/\/.*?/i,
	/[dD][iI][sS][cC][oO][rR][dD]\s*\.\s*[gG][gG]/i,
	/(?:%[0-9a-fA-F]{2}){2,}/i,
	/(?:https?:\/\/)?(?:%[0-9a-fA-F]{2})+(?:\.[a-zA-Z]{2,}|\/%[0-9a-fA-F]{2,})*/i,
	/discord:\/-\/invite\/[a-zA-Z0-9\-\_]+/i,
	/^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/invite\/([\w-]+)$/i
];

const ANTIPUB_ALLOW_LIST: string[] = [
	"*github.com*",
	"*gitlab.com*",
	"*giphy.com*",
	"*tenor.com*",
	"*imgur.com*",
	"*gyazo.com*",
	"*ezgif.com*",
	"*reddit.com*",
	"*tumblr.com*",
	"*twitter.com*",
	"*x.com*",
	"*youtube.com*",
	"*youtu.be*",
	"*cdn.discordapp.com*",
	"*streamable.com*",
	"*files.catbox.moe*",
	"*0x0.st*",
	"*flickr.com*",
	"*postimages.org*",
	"*imagebam.com*"
];

const INVITE_REGEX_PATTERNS: RegExp[] = [
	/(discord\.gg\/|\.gg\/|gg\/)/i,
	/[dD][iI][sS][cC][oO][rR][dD]\s*\.\s*[gG][gG]/i,
	/discord:\/-\/invite\/[a-zA-Z0-9\-\_]+/i,
	/^(?:[a-z]+:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/invite\/([\w-]+)$/i,
	/(?:https?:\/\/)?(?:%[0-9a-fA-F]{2})+(?:\/[a-zA-Z0-9\-_]+)?/i
];

const INVITE_ALLOW_LIST: string[] = ["*github.com*", "*gitlab.com*"];

const TELEGRAM_REGEX_PATTERNS: RegExp[] = [
	/(?:https?:\/\/)?t\.me\/[^\s]+/i,
	/(?:https?:\/\/)?telegram\.me\/[^\s]+/i,
	/(?:https?:\/\/)?telegram\.dog\/[^\s]+/i,
	/(?:https?:\/\/)?[A-Za-z0-9_]{4,32}\.t\.me\/[^\s]+/i,
	/tg:\/\/resolve\?[^\s]+/i,
	/tg:\/\/join\?[^\s]+/i,
	/tg:\/\/addstickers\?[^\s]+/i,
	/tg:\/\/addemoji\?[^\s]+/i,
	/tg:\/\/addtheme\?[^\s]+/i,
	/tg:\/\/[^\s]+/i
];

// The "links" and "Discord invites" rules share the same name,
// so they are told apart by one regex pattern only present in each of them.
const ANTIPUB_MARKER = ANTIPUB_REGEX_PATTERNS[2].source;
const INVITE_MARKER = INVITE_REGEX_PATTERNS[3].source;

export type NativeRules = Partial<Record<AutomodRuleKey, AutoModerationRule>>;

export interface RuleSettings {
	bypassRoles: string[];
	logsChannel: string | null;
	mentionLimit: number | null;
}

export async function fetchNativeRules(guild: Guild): Promise<NativeRules> {
	const fetched = await guild.autoModerationRules.fetch();

	const keywordRules = fetched.filter(
		(rule) => rule.triggerType === AutoModerationRuleTriggerType.Keyword
	);

	const legacyAdRules = keywordRules.filter(
		(rule) => rule.name === LEGACY_AD_RULE_NAME
	);

	return {
		spam: fetched.find(
			(rule) => rule.triggerType === AutoModerationRuleTriggerType.Spam
		),
		mass_mention: fetched.find(
			(rule) =>
				rule.triggerType === AutoModerationRuleTriggerType.MentionSpam
		),
		telegram: keywordRules.find((rule) => rule.name === TELEGRAM_RULE_NAME),
		antipub: legacyAdRules.find((rule) =>
			(rule.triggerMetadata.regexPatterns ?? []).some((pattern) =>
				pattern.includes(ANTIPUB_MARKER)
			)
		),
		media: legacyAdRules.find((rule) =>
			(rule.triggerMetadata.regexPatterns ?? []).some((pattern) =>
				pattern.includes(INVITE_MARKER)
			)
		)
	};
}

function readLogsChannel(rule: AutoModerationRule | undefined): string | null {
	if (!rule) return null;

	const alertAction = rule.actions.find(
		(action) => action.type === AutoModerationActionType.SendAlertMessage
	);

	return alertAction?.metadata.channelId ?? null;
}

/** What a rule uses: from Discord when it exists, else what the panel stored. */
export function resolveRuleSettings(
	guild: Guild,
	rule: AutoModerationRule | undefined,
	stored: DatabaseStructure.AutomodRulePanelSchema | undefined
): RuleSettings {
	// Discord keeps the ids of deleted roles / channels in the rule, and
	// discord.js maps them to undefined. Drop them so the panel opens and
	// the next edit does not send unknown snowflakes back to the API.
	const bypassRoles = (
		rule ? [...rule.exemptRoles.keys()] : (stored?.bypassRoles ?? [])
	).filter((roleId) => guild.roles.cache.has(roleId));

	const logsChannel = readLogsChannel(rule) ?? stored?.logsChannel ?? null;

	return {
		bypassRoles,
		logsChannel:
			logsChannel && guild.channels.cache.has(logsChannel)
				? logsChannel
				: null,
		mentionLimit: rule?.triggerMetadata.mentionTotalLimit ?? null
	};
}

export function ruleActions(
	logsChannel: string | null
): AutoModerationActionOptions[] {
	const actions: AutoModerationActionOptions[] = [
		{
			type: AutoModerationActionType.BlockMessage,
			metadata: { customMessage: AUTOMOD_CUSTOM_MESSAGE }
		}
	];

	if (logsChannel) {
		actions.push({
			type: AutoModerationActionType.SendAlertMessage,
			metadata: { channel: logsChannel }
		});
	}

	return actions;
}

function ruleDefinition(
	key: AutomodRuleKey,
	mentionLimit: number | null
): {
	name: string;
	triggerType: AutoModerationRuleTriggerType;
	triggerMetadata: AutoModerationTriggerMetadataOptions;
} {
	switch (key) {
		case "spam":
			return {
				name: SPAM_RULE_NAME,
				triggerType: AutoModerationRuleTriggerType.Spam,
				triggerMetadata: {}
			};
		case "mass_mention":
			return {
				name: MENTION_RULE_NAME,
				triggerType: AutoModerationRuleTriggerType.MentionSpam,
				triggerMetadata: {
					mentionTotalLimit: mentionLimit ?? DEFAULT_MENTION_LIMIT
				}
			};
		case "antipub":
			return {
				name: LEGACY_AD_RULE_NAME,
				triggerType: AutoModerationRuleTriggerType.Keyword,
				triggerMetadata: {
					regexPatterns: ANTIPUB_REGEX_PATTERNS.map(
						(pattern) => pattern.source
					),
					allowList: ANTIPUB_ALLOW_LIST
				}
			};
		case "media":
			return {
				name: LEGACY_AD_RULE_NAME,
				triggerType: AutoModerationRuleTriggerType.Keyword,
				triggerMetadata: {
					regexPatterns: INVITE_REGEX_PATTERNS.map(
						(pattern) => pattern.source
					),
					allowList: INVITE_ALLOW_LIST
				}
			};
		case "telegram":
		default:
			return {
				name: TELEGRAM_RULE_NAME,
				triggerType: AutoModerationRuleTriggerType.Keyword,
				triggerMetadata: {
					regexPatterns: TELEGRAM_REGEX_PATTERNS.map(
						(pattern) => pattern.source
					)
				}
			};
	}
}

/** Edits the rule when it exists, creates it otherwise. */
export async function enableNativeRule(
	guild: Guild,
	key: AutomodRuleKey,
	existing: AutoModerationRule | undefined,
	settings: RuleSettings
): Promise<void> {
	const data = ruleDefinition(key, settings.mentionLimit);
	const actions = ruleActions(settings.logsChannel);

	if (existing) {
		await existing.edit({
			name: data.name,
			enabled: true,
			triggerMetadata: data.triggerMetadata,
			actions,
			exemptRoles: settings.bypassRoles
		});
	} else {
		await guild.autoModerationRules.create({
			name: data.name,
			enabled: true,
			eventType: AutoModerationRuleEventType.MessageSend,
			triggerType: data.triggerType,
			triggerMetadata: data.triggerMetadata,
			actions,
			exemptRoles: settings.bypassRoles
		});
	}
}

/** Turns one rule on or off, keeping its bypass roles, logs and mention limit. */
export async function setNativeRuleEnabled(
	guild: Guild,
	key: AutomodRuleKey,
	enabled: boolean,
	panel: DatabaseStructure.AutomodPanelSchema | null
): Promise<void> {
	const existing = (await fetchNativeRules(guild))[key];
	if (!enabled) {
		await existing?.setEnabled(false);
		return;
	}
	await enableNativeRule(
		guild,
		key,
		existing,
		resolveRuleSettings(guild, existing, panel?.[key])
	);
}

// The flags of GUILD_CONFIG mirroring a rule. "media" is a boolean, the rest
// "on" / "off". Telegram has none: it is only in the panel.
const FLAGS: { key: AutomodRuleKey; isOn: (value: unknown) => boolean }[] = [
	{ key: "spam", isOn: (v) => v === "on" },
	{ key: "mass_mention", isOn: (v) => v === "on" },
	{ key: "antipub", isOn: (v) => v === "on" },
	{ key: "media", isOn: (v) => v === true }
];

/** The rules a GUILD_CONFIG change turns on or off; absent is off. */
export function automodToggles(
	before: Record<string, unknown> | null | undefined,
	after: Record<string, unknown> | null | undefined
): { key: AutomodRuleKey; enabled: boolean }[] {
	return FLAGS.filter(
		({ key, isOn }) => isOn(before?.[key]) !== isOn(after?.[key])
	).map(({ key, isOn }) => ({ key, enabled: isOn(after?.[key]) }));
}

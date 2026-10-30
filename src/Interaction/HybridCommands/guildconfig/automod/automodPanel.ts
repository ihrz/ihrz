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
	ActionRowBuilder,
	AutoModerationActionOptions,
	AutoModerationActionType,
	AutoModerationRule,
	AutoModerationRuleEventType,
	AutoModerationRuleTriggerType,
	AutoModerationTriggerMetadataOptions,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	Message,
	MessageFlags,
	PermissionFlagsBits,
	RoleSelectMenuBuilder,
	RoleSelectMenuInteraction,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";
import logger from "../../../../core/logger.js";

const COLLECTOR_TIMEOUT = 800_000;
const PANEL_ACCENT_COLOR = 0x5865f2;
const DEFAULT_MENTION_LIMIT = 3;
const AUTOMOD_CUSTOM_MESSAGE = "This message was prevented by iHorizon";

const SPAM_RULE_NAME = "Block spam by iHorizon";
const MENTION_RULE_NAME = "Block mass-mention spam by iHorizon";
const LEGACY_AD_RULE_NAME = "Block advertissement message by iHorizon";
const TELEGRAM_RULE_NAME = "Block Telegram links by iHorizon";

type AutomodRuleKey =
	"spam" | "mass_mention" | "antipub" | "media" | "telegram";

const RULE_ORDER: AutomodRuleKey[] = [
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

interface AutomodRuleState {
	ruleId: string | null;
	enabled: boolean;
	bypassRoles: string[];
	logsChannel: string | null;
	mentionLimit: number | null;
}

interface AutomodPanelState {
	rule: AutomodRuleKey | null;
	rules: Record<AutomodRuleKey, AutomodRuleState>;
}

function emptyRuleState(): AutomodRuleState {
	return {
		ruleId: null,
		enabled: false,
		bypassRoles: [],
		logsChannel: null,
		mentionLimit: null
	};
}

export async function openAutomodPanel(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData
): Promise<void> {
	// Guard's Typing
	if (
		!client.user ||
		!interaction.member ||
		!interaction.guild ||
		!interaction.channel
	)
		return;

	const guildId = interaction.guildId!;
	const guild = interaction.guild;
	const authorId = interaction.member.user.id;

	const state: AutomodPanelState = {
		rule: null,
		rules: {
			spam: emptyRuleState(),
			mass_mention: emptyRuleState(),
			antipub: emptyRuleState(),
			media: emptyRuleState(),
			telegram: emptyRuleState()
		}
	};

	let nativeRules: Partial<Record<AutomodRuleKey, AutoModerationRule>> = {};
	let storedPanel: DatabaseStructure.AutomodPanelSchema = {};

	function ruleEmoji(key: AutomodRuleKey): string {
		switch (key) {
			case "spam":
				return client.iHorizon_Emojis.AutoMod_Spam;
			case "mass_mention":
				return client.iHorizon_Emojis.AutoMod_Mention;
			case "antipub":
				return client.iHorizon_Emojis.AutoMod_Link;
			case "media":
				return client.iHorizon_Emojis.AutoMod_Invite;
			case "telegram":
			default:
				return client.iHorizon_Emojis.AutoMod_Telegram;
		}
	}

	function ruleName(key: AutomodRuleKey): string {
		switch (key) {
			case "spam":
				return lang.automod_panel_rule_spam_name;
			case "mass_mention":
				return lang.automod_panel_rule_mass_mention_name;
			case "antipub":
				return lang.automod_panel_rule_antipub_name;
			case "media":
				return lang.automod_panel_rule_media_name;
			case "telegram":
			default:
				return lang.automod_panel_rule_telegram_name;
		}
	}

	function ruleDescription(key: AutomodRuleKey): string {
		switch (key) {
			case "spam":
				return lang.automod_panel_rule_spam_desc;
			case "mass_mention":
				return lang.automod_panel_rule_mass_mention_desc;
			case "antipub":
				return lang.automod_panel_rule_antipub_desc;
			case "media":
				return lang.automod_panel_rule_media_desc;
			case "telegram":
			default:
				return lang.automod_panel_rule_telegram_desc;
		}
	}

	function ruleStatus(ruleState: AutomodRuleState): string {
		return ruleState.enabled
			? `${client.iHorizon_Emojis.GreenTick} ${lang.var_enabled}`
			: `${client.iHorizon_Emojis.No} ${lang.var_disabled}`;
	}

	function prettyLogsChannel(ruleState: AutomodRuleState): string {
		return ruleState.logsChannel
			? `<#${ruleState.logsChannel}>`
			: lang.var_none;
	}

	function prettyBypassRoles(ruleState: AutomodRuleState): string {
		return ruleState.bypassRoles.length > 0
			? ruleState.bypassRoles.map((roleId) => `<@&${roleId}>`).join(", ")
			: lang.var_none;
	}

	function readLogsChannel(
		rule: AutoModerationRule | undefined
	): string | null {
		if (!rule) return null;

		const alertAction = rule.actions.find(
			(action) =>
				action.type === AutoModerationActionType.SendAlertMessage
		);

		return alertAction?.metadata.channelId ?? null;
	}

	function buildRuleState(
		key: AutomodRuleKey,
		rule: AutoModerationRule | undefined
	): AutomodRuleState {
		const stored = storedPanel?.[key];

		return {
			ruleId: rule?.id ?? null,
			enabled: rule?.enabled ?? false,
			bypassRoles: rule
				? rule.exemptRoles.map((role) => role.id)
				: (stored?.bypassRoles ?? []),
			logsChannel: readLogsChannel(rule) ?? stored?.logsChannel ?? null,
			mentionLimit: rule?.triggerMetadata.mentionTotalLimit ?? null
		};
	}

	async function loadPanelState(): Promise<void> {
		const fetched = await guild.autoModerationRules.fetch();

		const keywordRules = fetched.filter(
			(rule) => rule.triggerType === AutoModerationRuleTriggerType.Keyword
		);

		const legacyAdRules = keywordRules.filter(
			(rule) => rule.name === LEGACY_AD_RULE_NAME
		);

		nativeRules = {
			spam: fetched.find(
				(rule) =>
					rule.triggerType === AutoModerationRuleTriggerType.Spam
			),
			mass_mention: fetched.find(
				(rule) =>
					rule.triggerType ===
					AutoModerationRuleTriggerType.MentionSpam
			),
			telegram: keywordRules.find(
				(rule) => rule.name === TELEGRAM_RULE_NAME
			),
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

		storedPanel =
			((await client.db.get(
				`${guildId}.GUILD.GUILD_CONFIG.AUTOMOD_PANEL`
			)) as DatabaseStructure.AutomodPanelSchema | null) ?? {};

		for (const key of RULE_ORDER) {
			state.rules[key] = buildRuleState(key, nativeRules[key]);
		}
	}

	function buildActions(
		ruleState: AutomodRuleState
	): AutoModerationActionOptions[] {
		const actions: AutoModerationActionOptions[] = [
			{
				type: AutoModerationActionType.BlockMessage,
				metadata: { customMessage: AUTOMOD_CUSTOM_MESSAGE }
			}
		];

		if (ruleState.logsChannel) {
			actions.push({
				type: AutoModerationActionType.SendAlertMessage,
				metadata: { channel: ruleState.logsChannel }
			});
		}

		return actions;
	}

	function ruleMetadata(key: AutomodRuleKey): {
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
						mentionTotalLimit:
							state.rules.mass_mention.mentionLimit ??
							DEFAULT_MENTION_LIMIT
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

	async function syncLegacyDb(
		key: AutomodRuleKey,
		enable: boolean
	): Promise<void> {
		// The "media" flag is a legacy mirror that nothing reads back.
		if (key === "media") return;

		await client.db.set(
			`${guildId}.GUILD.GUILD_CONFIG.${key}`,
			enable ? "on" : "off"
		);
	}

	async function enableRule(key: AutomodRuleKey): Promise<void> {
		const ruleState = state.rules[key];
		const existing = nativeRules[key];
		const data = ruleMetadata(key);
		const actions = buildActions(ruleState);

		if (existing) {
			await existing.edit({
				name: data.name,
				enabled: true,
				triggerMetadata: data.triggerMetadata,
				actions,
				exemptRoles: ruleState.bypassRoles
			});
		} else {
			await guild.autoModerationRules.create({
				name: data.name,
				enabled: true,
				eventType: AutoModerationRuleEventType.MessageSend,
				triggerType: data.triggerType,
				triggerMetadata: data.triggerMetadata,
				actions,
				exemptRoles: ruleState.bypassRoles
			});
		}

		await syncLegacyDb(key, true);
		await loadPanelState();
	}

	async function disableRule(key: AutomodRuleKey): Promise<void> {
		const existing = nativeRules[key];

		if (existing) await existing.setEnabled(false);

		await syncLegacyDb(key, false);
		await loadPanelState();
	}

	function buildRuleSelectRow(
		disabled: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const select = new StringSelectMenuBuilder()
			.setCustomId("automod-panel-rule-select")
			.setPlaceholder(lang.automod_panel_select_placeholder)
			.setMinValues(1)
			.setMaxValues(1)
			.setDisabled(disabled);

		for (const key of RULE_ORDER) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(ruleName(key))
					.setValue(key)
					.setDescription(
						state.rules[key].enabled
							? lang.var_enabled
							: lang.var_disabled
					)
					.setEmoji(ruleEmoji(key))
					.setDefault(key === state.rule)
			);
		}

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			select
		);
	}

	function buildOverviewContent(): TextDisplayBuilder {
		const lines: string[] = [
			`### ${client.iHorizon_Emojis.Security} ${lang.automod_panel_overview_title}`
		];

		for (const key of RULE_ORDER) {
			const ruleState = state.rules[key];

			lines.push(
				[
					`${ruleEmoji(key)} **${ruleName(key)}** — ${ruleStatus(ruleState)}`,
					`> ${client.iHorizon_Emojis.Pin} ${lang.automod_panel_label_logs}: ${prettyLogsChannel(ruleState)} — ${client.iHorizon_Emojis.Ticket_Role} ${lang.automod_panel_label_bypass}: ${prettyBypassRoles(ruleState)}`
				].join("\n")
			);
		}

		return new TextDisplayBuilder().setContent(lines.join("\n"));
	}

	function buildDetailContent(key: AutomodRuleKey): TextDisplayBuilder {
		const ruleState = state.rules[key];

		return new TextDisplayBuilder().setContent(
			[
				`## ${ruleEmoji(key)} ${ruleName(key)}`,
				`${ruleStatus(ruleState)}`,
				ruleDescription(key),
				"",
				`**${client.iHorizon_Emojis.Pin} ${lang.automod_panel_label_logs}:** ${prettyLogsChannel(ruleState)}`,
				`**${client.iHorizon_Emojis.Ticket_Role} ${lang.automod_panel_label_bypass}:** ${prettyBypassRoles(ruleState)}`,
				key === "mass_mention"
					? `**${client.iHorizon_Emojis.Timer} ${lang.automod_panel_label_mention_limit}:** ${ruleState.mentionLimit ?? DEFAULT_MENTION_LIMIT}`
					: ""
			].join("\n")
		);
	}

	function buildToggleRow(): ActionRowBuilder<ButtonBuilder> {
		const key = state.rule as AutomodRuleKey;
		const enabled = state.rules[key].enabled;

		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("automod-panel-toggle")
				.setLabel(
					enabled
						? lang.automod_panel_disable_button
						: lang.automod_panel_enable_button
				)
				.setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
				.setEmoji(
					enabled
						? client.iHorizon_Emojis.No
						: client.iHorizon_Emojis.Yes
				)
		);
	}

	function buildLogsRow(
		disabled: boolean
	): ActionRowBuilder<ChannelSelectMenuBuilder> {
		const key = state.rule as AutomodRuleKey;

		const select = new ChannelSelectMenuBuilder()
			.setCustomId("automod-panel-logs")
			.setPlaceholder(lang.automod_panel_logs_placeholder)
			.setChannelTypes(ChannelType.GuildText)
			.setMinValues(0)
			.setMaxValues(1)
			.setDisabled(disabled);

		const current = state.rules[key].logsChannel;
		if (current) select.setDefaultChannels([current]);

		return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
			select
		);
	}

	function buildBypassRow(
		disabled: boolean
	): ActionRowBuilder<RoleSelectMenuBuilder> {
		const key = state.rule as AutomodRuleKey;

		const select = new RoleSelectMenuBuilder()
			.setCustomId("automod-panel-bypass")
			.setPlaceholder(lang.automod_panel_bypass_placeholder)
			.setMinValues(0)
			.setMaxValues(10)
			.setDisabled(disabled);

		const current = state.rules[key].bypassRoles;
		if (current.length > 0) select.setDefaultRoles(current);

		return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
			select
		);
	}

	function buildNavRow(disabled: boolean): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("automod-panel-back")
				.setLabel(lang.automod_panel_back_button)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(disabled || state.rule === null),
			new ButtonBuilder()
				.setCustomId("automod-panel-refresh")
				.setLabel(lang.automod_panel_refresh_button)
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(client.iHorizon_Emojis.Restore)
				.setDisabled(disabled),
			new ButtonBuilder()
				.setCustomId("automod-panel-close")
				.setLabel(lang.automod_panel_close_button)
				.setStyle(ButtonStyle.Danger)
				.setEmoji(client.iHorizon_Emojis.No)
				.setDisabled(disabled)
		);
	}

	async function render(
		message: Message<true>,
		disabled: boolean = false
	): Promise<void> {
		const container = new ContainerBuilder().setAccentColor(
			PANEL_ACCENT_COLOR
		);

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`## ${client.iHorizon_Emojis.Uses_Automod_Badge} ${lang.automod_panel_title}`
			),
			new TextDisplayBuilder().setContent(lang.automod_panel_desc)
		);

		container.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Small)
		);

		if (state.rule === null) {
			container.addTextDisplayComponents(buildOverviewContent());
		} else {
			container.addTextDisplayComponents(buildDetailContent(state.rule));
		}

		container.addActionRowComponents(buildRuleSelectRow(disabled));

		if (state.rule !== null) {
			container.addActionRowComponents(buildToggleRow());
			container.addActionRowComponents(buildLogsRow(disabled));
			container.addActionRowComponents(buildBypassRow(disabled));
		}

		container.addActionRowComponents(buildNavRow(disabled));

		await message.edit({
			components: [container],
			files: [],
			flags: [MessageFlags.IsComponentsV2]
		});
	}

	async function feedback(
		source:
			| ButtonInteraction<"cached">
			| RoleSelectMenuInteraction<"cached">
			| ChannelSelectMenuInteraction<"cached">,
		content: string
	): Promise<void> {
		try {
			await source.followUp({ content, flags: [1 << 6] });
		} catch (error) {
			logger.debug("AutoMod panel feedback skipped: " + String(error));
		}
	}

	function apiErrorMessage(): string {
		return `${client.iHorizon_Emojis.Warning_Icon} ${lang.automod_panel_api_error}`;
	}

	async function handleToggle(
		source: ButtonInteraction<"cached">,
		message: Message<true>
	): Promise<void> {
		const key = state.rule as AutomodRuleKey;

		await source.deferUpdate().catch(() => null);

		try {
			if (state.rules[key].enabled) {
				await disableRule(key);
				await feedback(
					source,
					lang.automod_panel_rule_disabled.replace(
						"${rule}",
						ruleName(key)
					)
				);
			} else {
				await enableRule(key);
				await feedback(
					source,
					lang.automod_panel_rule_enabled.replace(
						"${rule}",
						ruleName(key)
					)
				);
			}
		} catch (error) {
			logger.err(error);
			await feedback(source, apiErrorMessage());
		}

		await render(message);
	}

	async function handleBypassPick(
		source: RoleSelectMenuInteraction<"cached">,
		message: Message<true>
	): Promise<void> {
		const key = state.rule as AutomodRuleKey;
		const roleIds = source.values.filter((roleId) => roleId !== guildId);

		await source.deferUpdate().catch(() => null);

		await client.db.set(
			`${guildId}.GUILD.GUILD_CONFIG.AUTOMOD_PANEL.${key}.bypassRoles`,
			roleIds
		);
		state.rules[key].bypassRoles = roleIds;

		try {
			const existing = nativeRules[key];
			if (existing) await existing.edit({ exemptRoles: roleIds });
		} catch (error) {
			logger.err(error);
			await feedback(source, apiErrorMessage());
			await render(message);
			return;
		}

		await feedback(
			source,
			lang.automod_panel_bypass_saved.replace("${rule}", ruleName(key))
		);
		await render(message);
	}

	async function handleLogsPick(
		source: ChannelSelectMenuInteraction<"cached">,
		message: Message<true>
	): Promise<void> {
		const key = state.rule as AutomodRuleKey;
		const channelId = source.channels.first()?.id ?? null;

		await source.deferUpdate().catch(() => null);

		state.rules[key].logsChannel = channelId;

		if (channelId) {
			await client.db.set(
				`${guildId}.GUILD.GUILD_CONFIG.AUTOMOD_PANEL.${key}.logsChannel`,
				channelId
			);
		} else {
			await client.db.delete(
				`${guildId}.GUILD.GUILD_CONFIG.AUTOMOD_PANEL.${key}.logsChannel`
			);
		}

		try {
			const existing = nativeRules[key];
			if (existing && state.rules[key].enabled) {
				await existing.edit({
					actions: buildActions(state.rules[key])
				});
			}
		} catch (error) {
			logger.err(error);
			await feedback(source, apiErrorMessage());
			await render(message);
			return;
		}

		await feedback(
			source,
			channelId
				? lang.automod_panel_logs_saved
						.replace("${rule}", ruleName(key))
						.replace("${channel}", `<#${channelId}>`)
				: lang.automod_panel_logs_reset.replace(
						"${rule}",
						ruleName(key)
					)
		);
		await render(message);
	}

	if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
		await client.func.method.interactionSend(interaction, {
			content: apiErrorMessage()
		});
		return;
	}

	try {
		await loadPanelState();
	} catch (error) {
		logger.err(error);
		await client.func.method.interactionSend(interaction, {
			content: apiErrorMessage()
		});
		return;
	}

	const placeholder = (await client.func.method.interactionSend(interaction, {
		components: [
			new ContainerBuilder()
				.setAccentColor(PANEL_ACCENT_COLOR)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`## ${client.iHorizon_Emojis.Uses_Automod_Badge} ${lang.automod_panel_title}`
					)
				)
		],
		flags: [MessageFlags.IsComponentsV2]
	})) as Message<true>;

	await render(placeholder);

	const collector = placeholder.createMessageComponentCollector({
		time: COLLECTOR_TIMEOUT
	});

	collector.on("collect", async (collected) => {
		if (collected.user.id !== authorId) {
			await collected.reply({
				content: lang.help_not_for_you,
				flags: [1 << 6]
			});
			return;
		}

		try {
			if (collected.isStringSelectMenu()) {
				const source =
					collected as StringSelectMenuInteraction<"cached">;

				if (source.customId === "automod-panel-rule-select") {
					await source.deferUpdate();
					state.rule = source.values[0] as AutomodRuleKey;
					await render(placeholder);
				}
				return;
			}

			if (collected.isRoleSelectMenu()) {
				const source = collected as RoleSelectMenuInteraction<"cached">;

				if (source.customId === "automod-panel-bypass") {
					await handleBypassPick(source, placeholder);
				}
				return;
			}

			if (collected.isChannelSelectMenu()) {
				const source =
					collected as ChannelSelectMenuInteraction<"cached">;

				if (source.customId === "automod-panel-logs") {
					await handleLogsPick(source, placeholder);
				}
				return;
			}

			if (collected.isButton()) {
				const source = collected as ButtonInteraction<"cached">;

				switch (source.customId) {
					case "automod-panel-toggle": {
						await handleToggle(source, placeholder);
						break;
					}
					case "automod-panel-back": {
						await source.deferUpdate().catch(() => null);
						state.rule = null;
						await render(placeholder);
						break;
					}
					case "automod-panel-refresh": {
						await source.deferUpdate().catch(() => null);

						try {
							await loadPanelState();
						} catch (error) {
							logger.err(error);
							await feedback(source, apiErrorMessage());
						}

						await render(placeholder);
						break;
					}
					case "automod-panel-close": {
						await source.deferUpdate().catch(() => null);
						collector.stop("automod-panel-closed");
						break;
					}
				}
			}
		} catch (error) {
			logger.err(error);
		}
	});

	collector.on("end", async () => {
		try {
			await render(placeholder, true);
		} catch {
			// The panel message may have been deleted, nothing to disable.
		}
	});
}

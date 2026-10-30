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
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	Message,
	MessageFlags,
	PermissionFlagsBits,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import logger from "../../../core/logger.js";

const COLLECTOR_TIMEOUT = 800_000;
const PANEL_ACCENT_COLOR = 0x3b9614;

type ProtectRuleKey =
	| "webhook"
	| "updateguild"
	| "createchannel"
	| "updatechannel"
	| "deletechannel"
	| "createrole"
	| "deleterole"
	| "updaterole"
	| "updatemember"
	| "banmembers"
	| "kickmember"
	| "unbanmembers"
	| "add_admin_roles";

type ProtectMode = "allowlist" | "member" | "nobody";

type ProtectSanction =
	"simply" | "simply+derank" | "simply+ban" | "simply+kick" | "simply+mute";

type ProtectGroupKey = "server" | "channels" | "roles" | "members";

const RULE_GROUPS: { key: ProtectGroupKey; rules: ProtectRuleKey[] }[] = [
	{ key: "server", rules: ["webhook", "updateguild"] },
	{
		key: "channels",
		rules: ["createchannel", "updatechannel", "deletechannel"]
	},
	{
		key: "roles",
		rules: ["createrole", "deleterole", "updaterole", "add_admin_roles"]
	},
	{
		key: "members",
		rules: ["updatemember", "banmembers", "kickmember", "unbanmembers"]
	}
];

const RULE_ORDER: ProtectRuleKey[] = RULE_GROUPS.flatMap(
	(group) => group.rules
);

const MODE_ORDER: ProtectMode[] = ["allowlist", "member", "nobody"];

const SANCTION_ORDER: ProtectSanction[] = [
	"simply",
	"simply+derank",
	"simply+ban",
	"simply+kick",
	"simply+mute"
];

interface ProtectRuleState {
	enabled: boolean;
	mode: ProtectMode;
	sanction: ProtectSanction | null;
}

interface ProtectPanelState {
	rule: ProtectRuleKey | null;
	globalSanction: ProtectSanction | null;
	rules: Record<ProtectRuleKey, ProtectRuleState>;
}

function emptyRuleState(): ProtectRuleState {
	return {
		enabled: false,
		mode: "allowlist",
		sanction: null
	};
}

function isProtectMode(value: unknown): value is ProtectMode {
	return MODE_ORDER.includes(value as ProtectMode);
}

function toProtectSanction(value: unknown): ProtectSanction | null {
	return SANCTION_ORDER.includes(value as ProtectSanction)
		? (value as ProtectSanction)
		: null;
}

export async function openProtectPanel(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached">,
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

	const guildId = interaction.guildId;
	const guild = interaction.guild;
	const authorId = interaction.member.user.id;

	const state: ProtectPanelState = {
		rule: null,
		globalSanction: null,
		rules: Object.fromEntries(
			RULE_ORDER.map((key) => [key, emptyRuleState()])
		) as Record<ProtectRuleKey, ProtectRuleState>
	};

	function ruleEmoji(key: ProtectRuleKey): string {
		switch (key) {
			case "webhook":
				return client.iHorizon_Emojis.Zap;
			case "updateguild":
				return client.iHorizon_Emojis.Gear;
			case "createchannel":
				return client.iHorizon_Emojis.Plus;
			case "updatechannel":
				return client.iHorizon_Emojis.Save_Clip;
			case "deletechannel":
				return client.iHorizon_Emojis.Ticket_Trash;
			case "createrole":
				return client.iHorizon_Emojis.Nametag;
			case "deleterole":
				return client.iHorizon_Emojis.Minus;
			case "updaterole":
				return client.iHorizon_Emojis.Ticket_Paint;
			case "updatemember":
				return client.iHorizon_Emojis.Ticket_User;
			case "banmembers":
				return client.iHorizon_Emojis.Ban_Hammer;
			case "kickmember":
				return client.iHorizon_Emojis.Guilty;
			case "unbanmembers":
				return client.iHorizon_Emojis.Unlock;
			case "add_admin_roles":
			default:
				return client.iHorizon_Emojis.Crown;
		}
	}

	function groupEmoji(key: ProtectGroupKey): string {
		switch (key) {
			case "server":
				return client.iHorizon_Emojis.Server_Stats;
			case "channels":
				return client.iHorizon_Emojis.Ticket_Category;
			case "roles":
				return client.iHorizon_Emojis.Ticket_Role;
			case "members":
			default:
				return client.iHorizon_Emojis.Ticket_List;
		}
	}

	function groupName(key: ProtectGroupKey): string {
		switch (key) {
			case "server":
				return lang.protect_panel_group_server;
			case "channels":
				return lang.protect_panel_group_channels;
			case "roles":
				return lang.protect_panel_group_roles;
			case "members":
			default:
				return lang.protect_panel_group_members;
		}
	}

	function ruleName(key: ProtectRuleKey): string {
		switch (key) {
			case "webhook":
				return lang.protect_panel_rule_webhook_name;
			case "updateguild":
				return lang.protect_panel_rule_updateguild_name;
			case "createchannel":
				return lang.protect_panel_rule_createchannel_name;
			case "updatechannel":
				return lang.protect_panel_rule_updatechannel_name;
			case "deletechannel":
				return lang.protect_panel_rule_deletechannel_name;
			case "createrole":
				return lang.protect_panel_rule_createrole_name;
			case "deleterole":
				return lang.protect_panel_rule_deleterole_name;
			case "updaterole":
				return lang.protect_panel_rule_updaterole_name;
			case "updatemember":
				return lang.protect_panel_rule_updatemember_name;
			case "banmembers":
				return lang.protect_panel_rule_banmembers_name;
			case "kickmember":
				return lang.protect_panel_rule_kickmember_name;
			case "unbanmembers":
				return lang.protect_panel_rule_unbanmembers_name;
			case "add_admin_roles":
			default:
				return lang.protect_panel_rule_add_admin_roles_name;
		}
	}

	function modeLabel(mode: ProtectMode): string {
		switch (mode) {
			case "member":
				return lang.authorization_actions_everyone;
			case "nobody":
				return lang.authorization_actions_nobody;
			case "allowlist":
			default:
				return lang.authorization_actions_allowlist;
		}
	}

	function sanctionLabel(sanction: ProtectSanction): string {
		switch (sanction) {
			case "simply+derank":
				return lang.protect_panel_sanction_derank;
			case "simply+ban":
				return lang.protect_panel_sanction_ban;
			case "simply+kick":
				return lang.protect_panel_sanction_kick;
			case "simply+mute":
				return lang.protect_panel_sanction_mute;
			case "simply":
			default:
				return lang.protect_panel_sanction_cancel;
		}
	}

	function ruleStatus(ruleState: ProtectRuleState): string {
		return ruleState.enabled
			? `${client.iHorizon_Emojis.GreenTick} ${lang.var_enabled}`
			: `${client.iHorizon_Emojis.No} ${lang.var_disabled}`;
	}

	function effectiveSanction(ruleState: ProtectRuleState): ProtectSanction {
		return ruleState.sanction ?? state.globalSanction ?? "simply";
	}

	function sanctionDisplay(ruleState: ProtectRuleState): string {
		if (ruleState.sanction) return sanctionLabel(ruleState.sanction);

		return `${sanctionLabel(effectiveSanction(ruleState))} (${lang.protect_panel_sanction_global})`;
	}

	async function loadPanelState(): Promise<void> {
		const protection = (await client.db.get(
			`${guildId}.PROTECTION`
		)) as DatabaseStructure.ProtectionData | null;

		state.globalSanction = toProtectSanction(protection?.SANCTION);

		for (const key of RULE_ORDER) {
			const entry = protection?.[key];
			const ruleData = entry && typeof entry === "object" ? entry : null;

			state.rules[key] = {
				enabled: !!ruleData,
				mode: isProtectMode(ruleData?.mode)
					? ruleData.mode
					: "allowlist",
				sanction: toProtectSanction(ruleData?.sanction)
			};
		}
	}

	async function saveRuleObject(key: ProtectRuleKey): Promise<void> {
		const ruleState = state.rules[key];
		const value: DatabaseStructure.ProtectionRuleData = {
			mode: ruleState.mode
		};

		if (ruleState.sanction) value.sanction = ruleState.sanction;

		await client.db.set(`${guildId}.PROTECTION.${key}`, value);
	}

	function buildRuleSelectRow(
		disabled: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const select = new StringSelectMenuBuilder()
			.setCustomId("protect-panel-rule-select")
			.setPlaceholder(lang.protect_panel_select_placeholder)
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

	function buildGlobalSelectRow(
		disabled: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const globalSanction = state.globalSanction ?? "simply";

		const select = new StringSelectMenuBuilder()
			.setCustomId("protect-panel-global")
			.setPlaceholder(lang.protect_panel_sanction_placeholder)
			.setMinValues(1)
			.setMaxValues(1)
			.setDisabled(disabled);

		for (const value of SANCTION_ORDER) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(sanctionLabel(value))
					.setValue(value)
					.setDefault(value === globalSanction)
			);
		}

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			select
		);
	}

	function buildModeSelectRow(
		disabled: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const key = state.rule as ProtectRuleKey;
		const ruleState = state.rules[key];

		const select = new StringSelectMenuBuilder()
			.setCustomId("protect-panel-mode")
			.setPlaceholder(lang.protect_panel_mode_placeholder)
			.setMinValues(1)
			.setMaxValues(1)
			.setDisabled(disabled || !ruleState.enabled);

		for (const value of MODE_ORDER) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(modeLabel(value))
					.setValue(value)
					.setDefault(value === ruleState.mode)
			);
		}

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			select
		);
	}

	function buildSanctionSelectRow(
		disabled: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const key = state.rule as ProtectRuleKey;
		const ruleState = state.rules[key];

		const select = new StringSelectMenuBuilder()
			.setCustomId("protect-panel-sanction")
			.setPlaceholder(lang.protect_panel_sanction_placeholder)
			.setMinValues(1)
			.setMaxValues(1)
			.setDisabled(disabled || !ruleState.enabled)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.protect_panel_sanction_global)
					.setValue("global")
					.setDefault(ruleState.sanction === null)
			);

		for (const value of SANCTION_ORDER) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(sanctionLabel(value))
					.setValue(value)
					.setDefault(value === ruleState.sanction)
			);
		}

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			select
		);
	}

	function buildOverviewContent(): TextDisplayBuilder {
		const lines: string[] = [
			`> ${client.iHorizon_Emojis.Warn} **${lang.protect_panel_global_label}:** ${sanctionLabel(state.globalSanction ?? "simply")} — ${lang.protect_panel_global_hint}`
		];

		for (const group of RULE_GROUPS) {
			lines.push(
				"",
				`### ${groupEmoji(group.key)} ${groupName(group.key)}`
			);

			for (const key of group.rules) {
				const ruleState = state.rules[key];
				const mode = ruleState.enabled
					? ` — ${modeLabel(ruleState.mode)}`
					: "";

				lines.push(
					`${ruleEmoji(key)} **${ruleName(key)}** — ${ruleStatus(ruleState)}${mode}`
				);
			}
		}

		return new TextDisplayBuilder().setContent(lines.join("\n"));
	}

	function buildDetailContent(key: ProtectRuleKey): TextDisplayBuilder {
		const ruleState = state.rules[key];

		return new TextDisplayBuilder().setContent(
			[
				`## ${ruleEmoji(key)} ${ruleName(key)}`,
				`${ruleStatus(ruleState)}`,
				lang.protect_panel_rule_help,
				"",
				`**${lang.protect_panel_bypass_label}:** ${ruleState.enabled ? modeLabel(ruleState.mode) : lang.var_none}`,
				`**${lang.protect_panel_sanction_label}:** ${sanctionDisplay(ruleState)}`
			].join("\n")
		);
	}

	function buildToggleRow(): ActionRowBuilder<ButtonBuilder> {
		const key = state.rule as ProtectRuleKey;
		const enabled = state.rules[key].enabled;

		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("protect-panel-toggle")
				.setLabel(
					enabled
						? lang.protect_panel_disable_button
						: lang.protect_panel_enable_button
				)
				.setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
				.setEmoji(
					enabled
						? client.iHorizon_Emojis.No
						: client.iHorizon_Emojis.Yes
				)
		);
	}

	function buildNavRow(disabled: boolean): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("protect-panel-back")
				.setLabel(lang.protect_panel_back_button)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(disabled || state.rule === null),
			new ButtonBuilder()
				.setCustomId("protect-panel-refresh")
				.setLabel(lang.protect_panel_refresh_button)
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(client.iHorizon_Emojis.Restore)
				.setDisabled(disabled),
			new ButtonBuilder()
				.setCustomId("protect-panel-close")
				.setLabel(lang.protect_panel_close_button)
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
				`## ${client.iHorizon_Emojis.Security} ${lang.protect_panel_title}`
			),
			new TextDisplayBuilder().setContent(lang.protect_panel_desc)
		);

		container.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Small)
		);

		if (state.rule === null) {
			container.addTextDisplayComponents(buildOverviewContent());
			container.addActionRowComponents(buildGlobalSelectRow(disabled));
		} else {
			container.addTextDisplayComponents(buildDetailContent(state.rule));
			container.addActionRowComponents(buildModeSelectRow(disabled));
			container.addActionRowComponents(buildSanctionSelectRow(disabled));
			container.addActionRowComponents(buildToggleRow());
		}

		container.addActionRowComponents(buildRuleSelectRow(disabled));
		container.addActionRowComponents(buildNavRow(disabled));

		await message.edit({
			components: [container],
			files: [],
			flags: [MessageFlags.IsComponentsV2]
		});
	}

	async function feedback(
		source:
			ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
		content: string
	): Promise<void> {
		try {
			await source.followUp({ content, flags: [1 << 6] });
		} catch (error) {
			logger.debug("Protect panel feedback skipped: " + String(error));
		}
	}

	function apiErrorMessage(): string {
		return `${client.iHorizon_Emojis.Warning_Icon} ${lang.protect_panel_api_error}`;
	}

	if (!guild.members.me?.permissions.has(PermissionFlagsBits.Administrator)) {
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
						`## ${client.iHorizon_Emojis.Security} ${lang.protect_panel_title}`
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

				switch (source.customId) {
					case "protect-panel-rule-select": {
						await source.deferUpdate();
						state.rule = source.values[0] as ProtectRuleKey;
						await render(placeholder);
						break;
					}
					case "protect-panel-global": {
						const value = toProtectSanction(source.values[0]);
						if (!value) return;

						await source.deferUpdate().catch(() => null);
						state.globalSanction = value;
						await client.db.set(
							`${guildId}.PROTECTION.SANCTION`,
							value
						);
						await feedback(
							source,
							lang.protect_panel_global_saved.replace(
								"${sanction}",
								sanctionLabel(value)
							)
						);
						await render(placeholder);
						break;
					}
					case "protect-panel-mode": {
						const key = state.rule as ProtectRuleKey;
						const value = source.values[0];
						if (!isProtectMode(value)) return;

						await source.deferUpdate().catch(() => null);
						state.rules[key].mode = value;
						await saveRuleObject(key);
						await feedback(
							source,
							lang.protect_panel_mode_saved
								.replace("${rule}", ruleName(key))
								.replace("${mode}", modeLabel(value))
						);
						await render(placeholder);
						break;
					}
					case "protect-panel-sanction": {
						const key = state.rule as ProtectRuleKey;
						const value =
							source.values[0] === "global"
								? null
								: toProtectSanction(source.values[0]);
						if (source.values[0] !== "global" && !value) return;

						await source.deferUpdate().catch(() => null);
						state.rules[key].sanction = value;
						await saveRuleObject(key);
						await feedback(
							source,
							lang.protect_panel_sanction_saved
								.replace("${rule}", ruleName(key))
								.replace(
									"${sanction}",
									value
										? sanctionLabel(value)
										: lang.protect_panel_sanction_global
								)
						);
						await render(placeholder);
						break;
					}
				}
				return;
			}

			if (collected.isButton()) {
				const source = collected as ButtonInteraction<"cached">;

				switch (source.customId) {
					case "protect-panel-toggle": {
						const key = state.rule as ProtectRuleKey;
						const ruleState = state.rules[key];

						await source.deferUpdate().catch(() => null);

						try {
							if (ruleState.enabled) {
								await client.db.delete(
									`${guildId}.PROTECTION.${key}`
								);
								ruleState.enabled = false;
								await feedback(
									source,
									lang.protect_panel_rule_disabled.replace(
										"${rule}",
										ruleName(key)
									)
								);
							} else {
								await saveRuleObject(key);
								ruleState.enabled = true;
								await feedback(
									source,
									lang.protect_panel_rule_enabled.replace(
										"${rule}",
										ruleName(key)
									)
								);
							}
						} catch (error) {
							logger.err(error);
							await feedback(source, apiErrorMessage());
						}

						await render(placeholder);
						break;
					}
					case "protect-panel-back": {
						await source.deferUpdate().catch(() => null);
						state.rule = null;
						await render(placeholder);
						break;
					}
					case "protect-panel-refresh": {
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
					case "protect-panel-close": {
						await source.deferUpdate().catch(() => null);
						collector.stop("protect-panel-closed");
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

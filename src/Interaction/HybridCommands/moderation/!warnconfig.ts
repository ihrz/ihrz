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

import { Client, ChatInputCommandInteraction, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";
import {
	getWarnConfig,
	sanctionLabel,
	setWarnConfig,
	WARN_ACTIONS,
	WARN_LIMITS,
	WarnConfig
} from "../../../core/modules/warnSystem.js";

// /mod warnconfig [threshold] [sanction] [duration] [expire-days]: changes
// what is given, then shows the settings. Without options, only shows them.
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (!client.user || !interaction.member || !interaction.guild) return;

		const opts = client.func.method.options(interaction, args);
		const threshold = opts.integer("threshold", 0);
		const sanction = opts.string("sanction", 1)?.toLowerCase() ?? null;
		const durationText = opts.string("duration", 2);
		const expireDays = opts.integer("expire-days", 3);
		const e = client.iHorizon_Emojis;
		const fail = (text: string) =>
			client.func.method.interactionSend(interaction, {
				content: text.replace("${emoji_No}", e.No)
			});

		const config: WarnConfig = await getWarnConfig(interaction.guild);
		let changed = false;

		if (expireDays !== null) {
			if (
				!Number.isInteger(expireDays) ||
				expireDays < 0 ||
				expireDays > WARN_LIMITS.expireDays
			)
				return void (await fail(lang.warnconfig_err_expiry));
			config.expireDays = expireDays;
			changed = true;
		}

		if (threshold !== null) {
			if (
				!Number.isInteger(threshold) ||
				threshold < 1 ||
				threshold > WARN_LIMITS.count
			)
				return void (await fail(lang.warnconfig_err_count));
			const others = config.rules.filter((r) => r.count !== threshold);
			if (sanction === "none") {
				config.rules = others;
			} else if (
				sanction &&
				WARN_ACTIONS.includes(
					sanction as DatabaseStructure.WarnSanctionAction
				)
			) {
				const action = sanction as DatabaseStructure.WarnSanctionAction;
				let duration: number | undefined;
				if (action === "timeout") {
					duration = durationText
						? client.timeCalculator.to_ms(durationText)
						: 0;
					if (
						!duration ||
						duration < WARN_LIMITS.minTimeout ||
						duration > WARN_LIMITS.maxTimeout
					)
						return void (await fail(lang.warnconfig_err_duration));
				}
				if (others.length >= WARN_LIMITS.rules)
					return void (await fail(lang.warnconfig_err_rules));
				config.rules = [
					...others,
					duration
						? { count: threshold, action, duration }
						: { count: threshold, action }
				];
			} else {
				return void (await fail(lang.warnconfig_err_sanction));
			}
			changed = true;
		}

		const saved = changed
			? await setWarnConfig(interaction.guild, config)
			: config;

		const rules = saved.rules.length
			? saved.rules
					.map(
						(r) =>
							`- ${lang.warnconfig_rule_line
								.replace("${count}", String(r.count))
								.replace(
									"${sanction}",
									sanctionLabel(r, lang, interaction.guild!)
								)}`
					)
					.join("\n")
			: lang.warnconfig_no_rules;

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: changed ? ACCENT.success : ACCENT.info,
				emoji: e.Warn,
				title: lang.warnconfig_title,
				description: changed
					? `${e.Yes} ${lang.warnconfig_saved}`
					: null,
				fields: [
					{
						emoji: e.Schedule,
						label: lang.warnconfig_label_expiry,
						value: saved.expireDays
							? lang.warnconfig_expiry_days.replace(
									"${days}",
									String(saved.expireDays)
								)
							: lang.warnconfig_expiry_never
					}
				],
				blocks: [
					`${e.Ban_Hammer} **${lang.warnconfig_label_rules}**\n${rules}`,
					`-# ${lang.warnconfig_hint}`
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
	}
};

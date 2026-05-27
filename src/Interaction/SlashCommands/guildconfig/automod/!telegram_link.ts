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
	Client,
	AutoModerationRuleTriggerType,
	ChatInputCommandInteraction
} from "discord.js";

interface Action {
	type: number;
	metadata: Record<string, any>;
}

const RULE_NAME = "Block Telegram links by iHorizon";
const regexPatterns: RegExp[] = [
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

import { LanguageData } from "../../../../../types/languageData.js";

import { SubCommand } from "../../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const turn = interaction.options.getString("action");
		const logs_channel = interaction.options.getChannel("logs-channel");

		const automodRules =
			await interaction.guild.autoModerationRules.fetch();
		const telegramRule = automodRules.find(
			(rule) =>
				rule.name === RULE_NAME &&
				rule.triggerType === AutoModerationRuleTriggerType.Keyword
		);

		const arrayActionsForRule: Action[] = [
			{
				type: 1,
				metadata: {
					customMessage: "This message was prevented by iHorizon"
				}
			}
		];

		if (logs_channel) {
			arrayActionsForRule.push({
				type: 2,
				metadata: {
					channel: logs_channel
				}
			});
		}

		if (turn === "on") {
			if (!telegramRule) {
				await interaction.guild.autoModerationRules.create({
					name: RULE_NAME,
					enabled: true,
					eventType: 1,
					triggerType: 1,
					triggerMetadata: {
						regexPatterns: regexPatterns.map((r) => r.source)
					},
					actions: arrayActionsForRule
				});
			} else if (telegramRule) {
				await telegramRule.edit({
					enabled: true,
					triggerMetadata: {
						regexPatterns: regexPatterns.map((r) => r.source)
					},
					actions: arrayActionsForRule
				});
			}

			await interaction.editReply({
				content: lang.automod_block_telegram_command_on
					.replace("${interaction.user}", interaction.user.toString())
					.replace(
						"${logs_channel}",
						logs_channel?.toString() || "None"
					)
			});

			return;
		} else if (turn === "off") {
			await telegramRule?.setEnabled(false);

			await interaction.editReply({
				content: lang.automod_block_telegram_command_off.replace(
					"${interaction.user}",
					interaction.user.toString()
				)
			});

			return;
		}
	}
};

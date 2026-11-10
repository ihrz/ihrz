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
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { acquireEconomyLock } from "../../../core/modules/economyLock.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const releaseLock = acquireEconomyLock(
			interaction.guildId!,
			interaction.member.user.id
		);
		if (!releaseLock) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_action_in_progress,
				flags: [1 << 6]
			});
			return;
		}

		let releaseTarget: (() => void) | null = null;
		try {
			if (
				(await client.db.get(
					`${interaction.guildId}.ECONOMY.disabled`
				)) === true
			) {
				await client.func.method.interactionSend(interaction, {
					content: lang.economy_disable_msg.replace(
						"${authorId}",
						interaction.member.user.id
					)
				});
				return;
			}

			const timeout =
				(await client.db.get(
					`${interaction.guildId}.ECONOMY.settings.rob.cooldown`
				)) ?? 3000000;
			const rob = await client.db.get(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.rob`
			);

			const opts = client.func.method.options(interaction, args);
			const user = opts.member("member", 0) as GuildMember;

			// The other member's balance is checked then changed: lock it too.
			if (user && user.id !== interaction.member.user.id) {
				releaseTarget = acquireEconomyLock(
					interaction.guildId!,
					user.id
				);
				if (!releaseTarget) {
					await client.func.method.interactionSend(interaction, {
						content: lang.economy_action_in_progress,
						flags: [1 << 6]
					});
					return;
				}
			}

			if (rob !== null && timeout - (Date.now() - rob) > 0) {
				const time = client.timeCalculator.to_beautiful_string(
					timeout - (Date.now() - rob),
					lang
				);

				await client.func.method.interactionSend(interaction, {
					content: lang.work_cooldown_error
						.replace("${authorId}", interaction.member.user.id)
						.replace("${time}", time),
					flags: [1 << 6]
				});
				return;
			}

			const targetuser = await client.db.get(
				`${interaction.guildId}.USER.${user.id}.ECONOMY.money`
			);
			const author = await client.db.get(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`
			);

			if (author < 250) {
				await client.func.method.interactionSend(interaction, {
					content: lang.rob_dont_enought_error
				});
				return;
			}

			if (targetuser < 250) {
				await client.func.method.interactionSend(interaction, {
					content: lang.rob_him_dont_enought_error.replaceAll(
						"${userUsername}",
						user.user.globalName as string
					)
				});
				return;
			}

			const random = client.func.random.secureRandomInt(1, 200);

			const embed = new EmbedBuilder()
				.setDescription(
					lang.rob_embed_description
						.replaceAll("${authorId}", interaction.member.user.id)
						.replaceAll("${userId}", user.id)
						.replaceAll("${random}", random.toString())
				)
				.setColor("#a4cb80")
				.setTimestamp();

			await client.db.set(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.rob`,
				Date.now()
			);
			await client.db.sub(
				`${interaction.guildId}.USER.${user.id}.ECONOMY.money`,
				random
			);
			await client.db.add(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`,
				random
			);

			await client.func.method.interactionSend(interaction, {
				embeds: [embed]
			});
			await client.func.economyLogs.rob(
				interaction.guild,
				interaction.member.user.id,
				user.id,
				random,
				lang
			);
		} finally {
			releaseTarget?.();
			releaseLock();
		}
	}
};

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

import { Client, ChatInputCommandInteraction } from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { decrypt } from "../../../core/functions/encryptDecryptMethod.js";

import { invalidateProtectionContext } from "../../../core/modules/protectionEngine.js";
import { SubCommand } from "../../../../types/command.js";

const PRESERVED_FIELDS = [
	"OWNER",
	"PROTECTION",
	"ALLOWLIST",
	"BLACKLIST",
	"USER"
] as const;

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

		// A restore replaces the whole guild document: only crown owners may
		// run it, an administrator could otherwise replay an old backup.
		if (
			!(await client.func.ownerHelper.isGuildOwner(
				interaction.user.id,
				interaction.guild
			))
		) {
			await interaction.editReply({
				content: lang.blockbot_not_owner
			});
			return;
		}

		const backup = interaction.options.getAttachment("backup-to-load");

		if (backup) {
			try {
				const response = await fetch(backup.url);
				const res = JSON.parse(
					decrypt(
						client.config.api.apiToken,
						await response.text()
					) || "{}"
				);

				if (
					!res ||
					typeof res !== "object" ||
					Array.isArray(res) ||
					res.guildId !== interaction.guildId
				) {
					await interaction.editReply({
						content: lang.guildconfig_config_restore_wrong_guild
					});
					return;
				}

				// Security and member state stays as it is now: a backup must
				// not bring back a removed allowlist entry, an older protection
				// setup, a lifted blacklist or spent balances. A field this
				// server has no data for at all (fresh server, migration) is
				// taken from the backup instead of being lost.
				const {
					guildId: _sourceGuildId,
					OWNER: _owner,
					PROTECTION: _protection,
					ALLOWLIST: _allowlist,
					BLACKLIST: _blacklist,
					USER: _user,
					...data
				} = res;
				const current =
					((await client.db.get(`${interaction.guildId}`)) as Record<
						string,
						unknown
					> | null) || {};
				const kept: Record<string, unknown> = {};
				for (const field of PRESERVED_FIELDS) {
					if (current[field] !== undefined) {
						kept[field] = current[field];
					} else if (
						(res as Record<string, unknown>)[field] !== undefined
					) {
						kept[field] = (res as Record<string, unknown>)[field];
					}
				}

				await client.db.set(`${interaction.guildId}`, {
					...data,
					...kept
				});
				invalidateProtectionContext(interaction.guildId);
			} catch (error) {
				await interaction.editReply({
					content: lang.guildconfig_config_restore_err_msg
				});
				return;
			}
		}

		await interaction.editReply({
			content: lang.guildconfig_config_restore_msg
		});
		return;
	}
};

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
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	Guild,
	UserResolvable,
	ApplicationCommandType,
	Message
} from "discord.js";

import { Command } from "../../../../types/command.js";
import { LanguageData } from "../../../../types/languageData.js";
import { blacklistTable } from "../../../Events/client/ready.js";

export const command: Command = {
	name: "unblacklist",

	description: "The user you want to unblacklist (Only Owner of ihorizon)!",
	description_localizations: {
		fr: "Enlever un utilisateur de la liste noir.(Seulement pour les dev)",
		ja: "ブラックリストから解除したいユーザー（iHorizonオーナーのみ）！",
		ru: "Пользователь для удаления из черного списка (Только владелец iHorizon)!",
		"es-ES":
			"El usuario que quieres quitar de la lista negra (Solo propietario de iHorizon)!",
		ko: "블랙리스트에서 제거할 사용자 (iHorizon 소유자 전용)!",
		uk: "Користувач, якого слід вилучити з чорного списку (лише власник iHorizon)!"
	},

	options: [
		{
			name: "user",
			type: ApplicationCommandOptionType.User,

			description:
				"The user you want to unblacklist (Only Owner of ihorizon)",
			description_localizations: {
				fr: "L'utilisateur que vous souhaitez supprimer de la liste noire (uniquement propriétaire d'ihorizon)",
				ja: "ブラックリストから解除したいユーザー（iHorizonオーナーのみ）",
				ru: "Пользователь для удаления из черного списка (Только владелец iHorizon)",
				"es-ES":
					"El usuario que quieres quitar de la lista negra (Solo propietario de iHorizon)",
				ko: "블랙리스트에서 제거할 사용자 (iHorizon 소유자 전용)",
				uk: "Користувач, якого слід вилучити з чорного списку (лише власник iHorizon)"
			},

			required: true,

			permission: null
		}
	],

	aliases: ["unbl"],

	thinking: false,
	category: "owner",
	type: ApplicationCommandType.ChatInput,
	permission: null,
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			await client.func.ownerHelper.isBotOwner(
				interaction.member?.user.id!
			)
		) {
			run_for_bot_owner(client, interaction, lang, args);
		} else if (
			await client.func.ownerHelper.isGuildOwner(
				interaction.member?.user.id!,
				interaction.guild!
			)
		) {
			run_for_guild_owner(client, interaction, lang, args);
		}
	}
};

export async function run_for_bot_owner(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData,
	args?: string[]
) {
	// Guard's Typing
	if (
		!client.user ||
		!interaction.member ||
		!interaction.guild ||
		!interaction.channel
	)
		return;

	if (
		!(await client.func.ownerHelper.isBotOwner(interaction.member.user.id))
	) {
		await client.func.method.interactionSend(interaction, {
			content: lang.unblacklist_not_owner
		});
		return;
	}

	const opts = client.func.method.options(interaction, args);
	const member = await opts.user("user", 0);

	const fetched = await blacklistTable.get(`${member?.id}`);

	if (!fetched) {
		await client.func.method.interactionSend(interaction, {
			content: lang.unblacklist_not_blacklisted.replace(
				"${memberId}",
				member?.id!
			)
		});
		return;
	}

	if (String(fetched.reason).toLowerCase().includes("transphobia")) {
		await client.func.method.interactionSend(
			interaction,
			client.iHorizon_Emojis.No +
				" | **Transphobia is a dangerous behavior, and in this case, it was even directed towards project staff. I will not remove him from the blacklist.**"
		);
		return;
	}

	const storedReason = String(fetched.reason ?? "");

	// Function to broadcast unban across all shards.
	// Only lifts bans the global blacklist placed: a ban the server applied
	// for another reason stays.
	async function broadcastUnbanAcrossShards(
		userId: string,
		username: string
	) {
		const results = await client.shard?.broadcastEval(
			async (c, { userId, storedReason }) => {
				const guilds = c.guilds.cache.filter(
					(g) =>
						g.members.me?.permissions.has("BanMembers") &&
						g.memberCount <= 500
				);
				let successCount = 0;
				const totalGuilds = guilds.size;

				const batchSize = 10;
				const delay = 100;
				const guildIds = Array.from(guilds.keys());

				// Same rule as isGlobalBlacklistBan (broadcastEval code cannot
				// reach module scope): keep both in sync.
				const isBlacklistBan = (reason: string | null | undefined) =>
					!!reason &&
					((storedReason !== "" && reason === storedReason) ||
						reason.includes("iHorizon Project Blacklist - ") ||
						(storedReason !== "" &&
							reason.includes("iHorizon") &&
							reason.endsWith(storedReason)));

				for (let i = 0; i < guildIds.length; i += batchSize) {
					const batch = guildIds.slice(i, i + batchSize);

					const batchPromises = batch.map(async (guildId) => {
						const guild = c.guilds.cache.get(guildId);
						if (!guild) return false;
						try {
							const ban = await guild.bans
								.fetch({ user: userId, force: true })
								.catch(() => null);
							if (!ban || !isBlacklistBan(ban.reason)) {
								return false;
							}
							await guild.members.unban(
								userId,
								"iHorizon Unblacklist"
							);
							return true;
						} catch {
							return false;
						}
					});

					const batchResults = await Promise.all(batchPromises);
					successCount += batchResults.filter((r) => r).length;

					if (i + batchSize < guildIds.length) {
						await new Promise((resolve) =>
							setTimeout(resolve, delay)
						);
					}
				}

				return { successCount, totalGuilds };
			},
			{ context: { userId, username, storedReason } }
		);

		// Sum up results from all shards
		const totalSuccess =
			results?.reduce((acc, curr) => acc + curr.successCount, 0) || 0;
		const totalGuilds =
			results?.reduce((acc, curr) => acc + curr.totalGuilds, 0) || 0;

		return { totalSuccess, totalGuilds };
	}

	try {
		const bannedMember = await client.users
			.fetch(member?.id as UserResolvable)
			.catch(() => null);

		if (!bannedMember) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unblacklist_user_is_not_exist
			});
			return;
		}

		await blacklistTable.delete(`${member?.id}`);
		await unbanIfMatching(interaction.guild, bannedMember.id, (reason) =>
			isGlobalBlacklistBan(reason, storedReason)
		);

		await client.func.method.interactionSend(interaction, {
			content: lang.unblacklist_command_work.replaceAll(
				"${memberId}",
				member?.id!
			)
		});

		// Send immediate response
		await client.func.method.channelSend(interaction, {
			content: lang.batch_unblacklist_process
				.replace("${bannedMemberUsername}", bannedMember.username)
				.replace("${guildObjectCount}", "all shards")
		});

		// Process unbans across all shards asynchronously
		setImmediate(async () => {
			const { totalSuccess, totalGuilds } =
				await broadcastUnbanAcrossShards(
					bannedMember.id,
					bannedMember.username
				);
			let score = `${totalSuccess}/${totalGuilds}`;

			// Send final result when processing is complete
			await client.func.method.channelSend(interaction, {
				content: lang.unblacklist_command_work_across_all_shard
					.replace("${bannedMemberUsername}", bannedMember.username)
					.replace("${totalSuccess}", totalSuccess.toString())
					.replace("${score}", score)
			});
		});

		return;
	} catch (e) {
		await blacklistTable.delete(`${member?.id}`);
		await client.func.method.interactionSend(interaction, {
			content: lang.unblacklist_unblacklisted_but_can_unban_him.replace(
				"${emoji_No}",
				client.iHorizon_Emojis.No
			)
		});
		return;
	}
}

export async function run_for_guild_owner(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData,
	args?: string[]
) {
	// Guard's Typing
	if (
		!client.user ||
		!interaction.member ||
		!interaction.guild ||
		!interaction.channel
	)
		return;

	if (
		!(await client.func.ownerHelper.isGuildOwner(
			interaction.member.user.id,
			interaction.guild
		))
	) {
		await client.func.method.interactionSend(interaction, {
			content: lang.unblacklist_not_owner
		});
		return;
	}

	const opts = client.func.method.options(interaction, args);
	const member = await opts.user("user", 0);

	const fetched = await client.db.get(
		`${interaction.guildId}.BLACKLIST.${member?.id}`
	);

	if (!fetched) {
		await client.func.method.interactionSend(interaction, {
			content: lang.unblacklist_not_blacklisted.replace(
				"${memberId}",
				member?.id!
			)
		});
		return;
	}

	const bannedMember = await client.users
		.fetch(member?.id as UserResolvable)
		.catch(() => null);

	if (!bannedMember) {
		await client.func.method.interactionSend(interaction, {
			content: lang.unblacklist_user_is_not_exist
		});
		return;
	}

	await client.db.delete(`${interaction.guildId}.BLACKLIST.${member?.id}`);
	// Stored local reasons fall back like the join ban in blacklistFetcher.ts.
	const storedReason = String(fetched.reason || "blacklisted!");
	await unbanIfMatching(interaction.guild, bannedMember.id, (reason) =>
		isServerBlacklistBan(reason, storedReason)
	);

	await client.func.method.interactionSend(interaction, {
		content: lang.unblacklist_command_work.replaceAll(
			"${memberId}",
			member?.id!
		)
	});

	return;
}

/**
 * True when a ban reason was written by the global blacklist: the
 * /blacklist ban itself (the stored reason, "iHorizon Project Blacklist - ..."
 * since 2024) or the join ban of blacklistFetcher.ts (global_blacklist_reason
 * in the guild's language, which names iHorizon and ends with the stored reason).
 */
export function isGlobalBlacklistBan(
	reason: string | null | undefined,
	storedReason: string
): boolean {
	if (!reason) return false;
	if (storedReason !== "" && reason === storedReason) return true;
	if (reason.includes("iHorizon Project Blacklist - ")) return true;
	return (
		storedReason !== "" &&
		reason.includes("iHorizon") &&
		reason.endsWith(storedReason)
	);
}

/**
 * True when a ban reason was written by this server's own blacklist: the
 * /blacklist ban ("Blacklist - ...") or the join ban (server_blacklist_reason,
 * which ends with the stored reason). Global blacklist bans name iHorizon and
 * are left alone.
 */
export function isServerBlacklistBan(
	reason: string | null | undefined,
	storedReason: string
): boolean {
	if (!reason) return false;
	if (reason === storedReason) return true;
	return !reason.includes("iHorizon") && reason.endsWith(storedReason);
}

async function unbanIfMatching(
	guild: Guild,
	userId: string,
	isMatch: (reason: string | null | undefined) => boolean
): Promise<boolean> {
	const ban = await guild.bans
		.fetch({ user: userId, force: true })
		.catch(() => null);
	if (!ban || !isMatch(ban.reason)) return false;
	return guild.members
		.unban(userId, "iHorizon Unblacklist")
		.then(() => true)
		.catch(() => false);
}

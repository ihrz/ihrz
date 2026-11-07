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
	BaseGuildTextChannel,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	Message
} from "discord.js";
import { LanguageData } from "../../../types/languageData.js";

type Interaction = ChatInputCommandInteraction<"cached"> | Message;

/**
 * Resolves the role argument of the lock commands: the role option for a
 * slash command, the first argument for a prefix command.
 */
function resolveRole(
	client: Client,
	interaction: Interaction,
	args?: string[]
) {
	if (interaction instanceof ChatInputCommandInteraction) {
		return interaction.options.getRole("role");
	}
	return client.func.method.role(interaction, args!, 0);
}

/**
 * Shared body of /lock and /unlock. They differ on purpose:
 * - lock denies SendMessages and Connect, without waiting for Discord: the
 *   confirmation (with the author mention) is sent once the edit succeeded, a
 *   failed edit is ignored, and the log is sent right away;
 * - unlock resets both to the default (null), waits for the edit (a failure
 *   rejects), then logs, then sends the confirmation as is.
 */
export async function setChannelLock(
	client: Client,
	interaction: Interaction,
	lang: LanguageData,
	args: string[] | undefined,
	mode: "lock" | "unlock"
) {
	// Guard's Typing
	if (
		!client.user ||
		!interaction.member ||
		!interaction.guild ||
		!interaction.channel
	)
		return;

	const role = resolveRole(client, interaction, args);

	const channel = interaction.channel as BaseGuildTextChannel;
	if (!channel?.permissionOverwrites?.edit) {
		await client.func.method.interactionSend(interaction, {
			content: lang.setrankroles_command_error.replace(
				"${emoji_No}",
				client.iHorizon_Emojis.No
			)
		});
		return;
	}

	const targetId = role?.id || interaction.guild.roles.everyone.id;

	if (mode === "lock") {
		channel.permissionOverwrites
			.edit(targetId, {
				SendMessages: false,
				Connect: false
			})
			.then(async () => {
				await client.func.method.interactionSend(interaction, {
					content: lang.lock_embed_message_description.replaceAll(
						"${authorId}",
						interaction.member!.user.id
					)
				});
			})
			.catch(() => {});

		await client.func.ihorizon_logs(interaction, {
			title: lang.lock_logs_embed_title,
			description: lang.lock_logs_embed_description
				.replaceAll("${authorId}", interaction.member.user.id)
				.replaceAll("${channelId}", interaction.channel.id as string)
		});
		return;
	}

	await channel.permissionOverwrites.edit(targetId, {
		SendMessages: null,
		Connect: null
	});
	await client.func.ihorizon_logs(interaction, {
		title: lang.unlock_logs_embed_title,
		description: lang.unlock_logs_embed_description
			.replaceAll("${authorId}", interaction.member.user.id)
			.replaceAll("${channelId}", interaction.channel.id)
	});

	await client.func.method.interactionSend(interaction, {
		content: lang.unlock_embed_message_description
	});
}

/**
 * Shared body of /lock-all and /unlock-all: sets SendMessages on every text
 * channel of the guild (not awaited), logs, then confirms.
 */
export async function setAllChannelsLock(
	client: Client,
	interaction: Interaction,
	lang: LanguageData,
	args: string[] | undefined,
	mode: "lock" | "unlock"
) {
	// Guard's Typing
	if (
		!client.user ||
		!interaction.member ||
		!interaction.guild ||
		!interaction.channel
	)
		return;

	const role = resolveRole(client, interaction, args);
	const locking = mode === "lock";

	interaction.guild.channels.cache.forEach((c) => {
		if (c.type === ChannelType.GuildText) {
			c.permissionOverwrites.create(
				role?.id || interaction.guild?.roles.everyone.id!,
				{ SendMessages: !locking }
			);
		}
	});

	await client.func.ihorizon_logs(interaction, {
		title: locking
			? lang.lockall_logs_embed_title
			: lang.unlockall_logs_embed_title,
		description: (locking
			? lang.lockall_logs_embed_description
			: lang.unlockall_logs_embed_description
		).replaceAll("${authorId}", interaction.member.user.id)
	});

	await client.func.method.interactionSend(interaction, {
		content: (locking
			? lang.lockall_embed_message_description
			: lang.unlockall_embed_message_description
		).replaceAll("${authorId}", interaction.member.user.id)
	});
}

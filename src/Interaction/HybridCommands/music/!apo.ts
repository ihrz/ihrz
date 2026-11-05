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
	Attachment,
	ChatInputCommandInteraction,
	Client,
	Message,
	escapeMarkdown
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	APO_MAX_BYTES,
	applyApoFilter,
	checkApo,
	getGuildApo,
	setGuildApo
} from "../../../core/modules/musicApo.js";

// Skipped lines shown in the reply (the node reports up to 100).
const SHOWN_WARNINGS = 5;

// /music apo [file]: set the server-wide Equalizer APO filter from an
// attached .txt configuration, or remove it when no file is attached. Bot
// owners only: the filter changes what everyone on the server hears.
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const send = (content: string) =>
			client.func.method.interactionSend(interaction, { content });
		const no = (text: string) =>
			text.replace("${emoji_No}", client.iHorizon_Emojis.No);

		const userId =
			interaction instanceof Message
				? interaction.author.id
				: interaction.user.id;
		if (!(await client.func.ownerHelper.isBotOwner(userId))) {
			await send(no(lang.music_apo_not_owner));
			return;
		}

		const guildId = interaction.guild.id;
		const player = client.player.getPlayer(guildId);
		const attachment: Attachment | null =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getAttachment("file")
				: (interaction.attachments.first() ?? null);

		// No file: remove the filter.
		if (!attachment) {
			const had = await getGuildApo(guildId);
			await setGuildApo(guildId, null);
			if (player) {
				await applyApoFilter(player, null).catch(() => undefined);
			}
			await send(
				had
					? lang.music_apo_removed.replace(
							"${emoji_Yes}",
							client.iHorizon_Emojis.Yes
						)
					: no(lang.music_apo_none)
			);
			return;
		}

		const maxKiB = String(APO_MAX_BYTES / 1024);
		if (
			!/\.txt$/i.test(attachment.name) ||
			attachment.size > APO_MAX_BYTES
		) {
			await send(no(lang.music_apo_bad_file).replace("${max}", maxKiB));
			return;
		}

		let config: string;
		try {
			const res = await fetch(attachment.url, {
				signal: AbortSignal.timeout(10_000)
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const bytes = await res.arrayBuffer();
			if (bytes.byteLength > APO_MAX_BYTES) throw new Error("too large");
			config = new TextDecoder().decode(bytes).replace(/^﻿/, "");
		} catch {
			await send(no(lang.music_apo_download_failed));
			return;
		}
		if (!config.trim()) {
			await send(no(lang.music_apo_bad_file).replace("${max}", maxKiB));
			return;
		}

		// Validate on the node that plays here, or on any connected node.
		const node =
			player?.node ??
			client.player.nodeManager.leastUsedNodes("playingPlayers")[0];
		if (!node) {
			await send(no(lang.music_apo_no_node));
			return;
		}
		const check = await checkApo(node, config);
		if (!check.ok) {
			await send(
				check.unsupported
					? no(lang.music_apo_unsupported)
					: no(lang.music_apo_invalid).replace(
							"${error}",
							escapeMarkdown(check.error).slice(0, 1500)
						)
			);
			return;
		}

		if (player) {
			try {
				await applyApoFilter(player, config);
			} catch (e) {
				await send(
					no(lang.music_apo_invalid).replace(
						"${error}",
						escapeMarkdown((e as Error).message).slice(0, 1500)
					)
				);
				return;
			}
		}
		await setGuildApo(guildId, {
			config,
			name: attachment.name,
			by: userId,
			at: Date.now()
		});

		let content =
			lang.music_apo_set
				.replace("${emoji_Yes}", client.iHorizon_Emojis.Yes)
				.replace("${name}", escapeMarkdown(attachment.name))
				.replace("${stages}", String(check.stages.length)) +
			"\n" +
			(player ? lang.music_apo_applied_now : lang.music_apo_applied_next);
		if (check.warnings.length) {
			const shown = check.warnings
				.slice(0, SHOWN_WARNINGS)
				.map((w) => w.slice(0, 180))
				.join("\n");
			content +=
				"\n" +
				lang.music_apo_warnings.replace(
					"${count}",
					String(check.warnings.length)
				) +
				"\n```\n" +
				shown.replace(/```/g, "'''") +
				"\n```";
		}
		await send(content);
	}
};

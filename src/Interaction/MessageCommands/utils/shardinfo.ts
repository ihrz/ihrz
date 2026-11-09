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

import { AttachmentBuilder, Client, EmbedBuilder, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import type { ShardGuildSample } from "../../../core/functions/shard_helper.ts";
import {
	renderShardInfoCard,
	summarizeShards
} from "../../../core/modules/shardInfoCard.ts";

function guildSection(title: string, guilds: ShardGuildSample[]): string {
	if (guilds.length === 0) return "";
	const lines = guilds
		.slice(0, 3)
		.map((guild) => `- ${guild.name} (${guild.id})`);
	return `\n\n**${title}**\n${lines.join("\n")}`;
}

export const command: Command = {
	name: "shardinfo",
	aliases: [],

	description: "...",
	description_localizations: {
		fr: "...",
		ja: "...",
		ru: "...",
		"es-ES": "..."
	},

	thinking: false,
	category: "owner",
	type: "PREFIX_IHORIZON_COMMAND",

	permission: null,
	run: async (
		client: Client,
		message: Message<true>,
		lang: LanguageData,
		options?: string[]
	) => {
		if (!(await client.func.ownerHelper.isBotOwner(message.author.id))) {
			return;
		}

		const probes =
			await client.func.shard_helper.collectShardProbes(client);
		const totals = summarizeShards(probes);
		const answered = probes.flatMap((probe) =>
			probe.data ? [probe.data] : []
		);
		const currentShardId = client.shard?.ids[0] ?? 0;
		const avatarUrl = client.user?.displayAvatarURL({
			extension: "png",
			size: 256
		});
		const avatar = avatarUrl
			? ((await client.func.image64.image64(avatarUrl)) ?? null)
			: null;
		const card = await renderShardInfoCard(
			probes,
			currentShardId,
			process.pid,
			lang,
			avatar
		);

		let description = lang.shardinfo_location
			.replace("${shardId}", String(message.guild.shardId))
			.replace("${handlerShardId}", String(currentShardId))
			.replace("${pid}", String(process.pid));
		description += `\n${lang.shardinfo_member_data
			.replace(
				"${exactCount}",
				totals.exactMembers.toLocaleString("en-US")
			)
			.replace(
				"${approximateCount}",
				totals.approximateMembers.toLocaleString("en-US")
			)
			.replace(
				"${missingCount}",
				totals.missingMembers.toLocaleString("en-US")
			)}`;
		if (totals.offlineIds.length > 0) {
			description += `\n${lang.shardinfo_offline_shards.replace(
				"${shards}",
				totals.offlineIds.join(", ")
			)}`;
		}
		description += guildSection(
			lang.shardinfo_section_unavailable,
			answered.flatMap((data) => data.samples.unavailable)
		);
		description += guildSection(
			lang.shardinfo_section_approximate,
			answered.flatMap((data) => data.samples.approximate)
		);
		description += guildSection(
			lang.shardinfo_section_missing,
			answered.flatMap((data) => data.samples.missing)
		);

		const embed = new EmbedBuilder()
			.setTitle(lang.shardinfo_title)
			.setDescription(description)
			.setColor("#010101")
			.setImage("attachment://shardinfo.png")
			.setTimestamp();

		await message.reply({
			embeds: [embed],
			files: [new AttachmentBuilder(card, { name: "shardinfo.png" })]
		});
	}
};

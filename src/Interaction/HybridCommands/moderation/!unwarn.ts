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
	Client,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMember,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";

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

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getMember(
				"member"
			) as GuildMember | null;
			var warnID = interaction.options.getString("warn-id")!;
		} else {
			var member = client.func.method.member(
				interaction,
				args!,
				0
			) as GuildMember | null;
			var warnID = client.func.method.longString(args!, 1)!;
		}

		const allWarns: DatabaseStructure.WarnsData[] | null =
			await client.db.get(
				`${interaction.guildId}.USER.${member?.id}.WARNS`
			);

		if (!allWarns || allWarns.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unwarn_cannot_found
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${member}", member?.toString()!)
			});
			return;
		}

		if (!allWarns.find((x) => x.id === warnID)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unwarn_cannot_found_id
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${member}", interaction.member?.toString()!)
			});
			return;
		}

		await client.db.set(
			`${interaction.guildId}.USER.${member?.id}.WARNS`,
			allWarns.filter((x) => x.id !== warnID)
		);

		await client.func.method.interactionSend(interaction, {
			content: lang.unwarn_command_ok
				.replace("${emoji_Yes}", client.iHorizon_Emojis.Yes)
				.replace("${member}", member?.toString()!)
		});

		const unwarnLogTitle = lang.unwarn_logEmbed_title;
		const unwarnLogDescription = lang.unwarn_logEmbed_desc
			.replace("${author}", interaction.member.toString())
			.replace("${member}", member?.toString()!);

		if (client.func.hasIhorizonLogs(interaction.guild)) {
			await client.func.ihorizon_logs(interaction, {
				title: unwarnLogTitle,
				description: unwarnLogDescription
			});
			return;
		}

		const unwarnLogEmbed = new EmbedBuilder()
			.setColor("#bf0bb9")
			.setTitle(unwarnLogTitle)
			.setDescription(unwarnLogDescription);

		const modsChannel = interaction.guild.channels.cache.find(
			(channel) => channel.name.includes("mods") && channel.isTextBased()
		) as BaseGuildTextChannel | undefined;

		if (modsChannel) {
			await modsChannel
				.send({ embeds: [unwarnLogEmbed] })
				.catch(() => {});
			return;
		}

		const moderationLogsId = (await client.db.get(
			`${interaction.guildId}.GUILD.SERVER_LOGS.moderation`
		)) as string | null;

		if (!moderationLogsId) return;

		const moderationLogsChannel = interaction.guild.channels.cache.get(
			moderationLogsId
		) as BaseGuildTextChannel | undefined;

		await moderationLogsChannel
			?.send({ embeds: [unwarnLogEmbed] })
			.catch(() => {});
	}
};

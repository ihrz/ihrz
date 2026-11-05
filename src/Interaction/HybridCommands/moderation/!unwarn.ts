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
	GuildMember,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	sendCard
} from "../../../core/modules/uiCard.js";

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

		const removedWarn = allWarns.find((x) => x.id === warnID);
		if (!removedWarn) {
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

		const e = client.iHorizon_Emojis;
		const warnedAt = Math.floor(removedWarn.timestamp / 1000);
		const resultCard = (signature: string | null) =>
			buildCard({
				accent: ACCENT.success,
				emoji: e.Yes,
				title: lang.unwarn_card_title,
				thumbnail: member?.displayAvatarURL({ size: 128 }),
				fields: [
					{
						emoji: e.Ticket_User,
						label: lang.utils_label_member,
						value: member ? `${member} (\`${member.id}\`)` : ""
					},
					{
						emoji: e.Security,
						label: lang.mod_label_moderator,
						value: interaction.member!.toString()
					},
					{
						emoji: e.Warn,
						label: lang.mod_label_warn_id,
						value: `\`${removedWarn.id}\``
					},
					{
						emoji: e.Paper,
						label: lang.var_reason,
						value: removedWarn.reason
					},
					{
						emoji: e.Schedule,
						label: lang.utils_label_by,
						value: `<@${removedWarn.authorID}> · <t:${warnedAt}:D>`
					}
				],
				signature
			});

		await sendCard(
			client,
			interaction,
			resultCard(await botSignature(client, interaction.guildId))
		);

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

		const unwarnLogCard = buildCard({
			accent: ACCENT.success,
			emoji: e.Logs,
			title: unwarnLogTitle,
			description: unwarnLogDescription,
			fields: [
				{
					emoji: e.Warn,
					label: lang.mod_label_warn_id,
					value: `\`${removedWarn.id}\``
				},
				{
					emoji: e.Paper,
					label: lang.var_reason,
					value: removedWarn.reason
				}
			]
		});

		const modsChannel = interaction.guild.channels.cache.find(
			(channel) => channel.name.includes("mods") && channel.isTextBased()
		) as BaseGuildTextChannel | undefined;

		if (modsChannel) {
			await modsChannel.send(cardPayload(unwarnLogCard)).catch(() => {});
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
			?.send(cardPayload(unwarnLogCard))
			.catch(() => {});
	}
};

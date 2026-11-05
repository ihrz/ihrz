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
	GuildMember,
	GuildVerificationLevel,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const guild = interaction.guild;
		const e = client.iHorizon_Emojis;
		const verification: Record<GuildVerificationLevel, string> = {
			[GuildVerificationLevel.None]: lang.serverinfo_verif_none,
			[GuildVerificationLevel.Low]: lang.serverinfo_verif_low,
			[GuildVerificationLevel.Medium]: lang.serverinfo_verif_medium,
			[GuildVerificationLevel.High]: lang.serverinfo_verif_high,
			[GuildVerificationLevel.VeryHigh]: lang.serverinfo_verif_highest
		};
		const ts = (date: Date | null | undefined) =>
			date
				? `<t:${Math.floor(date.getTime() / 1000)}:D> (<t:${Math.floor(date.getTime() / 1000)}:R>)`
				: "";
		const joinedAt = (interaction.member as GuildMember).joinedAt;

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.neutral,
				emoji: e.Server_Stats,
				title: guild.name,
				description: guild.description,
				thumbnail: guild.iconURL({ size: 256 }),
				fields: [
					{
						emoji: e.Crown,
						label: lang.serverinfo_label_owner,
						value: `<@${guild.ownerId}>`
					},
					{
						emoji: e.Stats,
						label: lang.serverinfo_label_members,
						value: `\`${guild.memberCount.toLocaleString()}\``
					},
					{
						emoji: e.Schedule,
						label: lang.serverinfo_label_created,
						value: ts(guild.createdAt)
					},
					{
						emoji: e.Home,
						label: lang.serverinfo_label_joined,
						value: ts(joinedAt)
					}
				],
				blocks: [
					[
						`${e.Ticket_Role} **${lang.serverinfo_label_roles}** : \`${guild.roles.cache.size}\``,
						`${e.Ticket_Hash} **${lang.serverinfo_label_channels}** : \`${guild.channels.cache.size}\``,
						`${e.Boost_Gem} **${lang.serverinfo_label_boosts}** : ${lang.serverinfo_boost_value
							.replace(
								"${count}",
								String(guild.premiumSubscriptionCount ?? 0)
							)
							.replace("${tier}", String(guild.premiumTier))}`,
						`${e.Security} **${lang.serverinfo_label_verification}** : ${verification[guild.verificationLevel]}`,
						`${e.Notification_Bell} **${lang.serverinfo_label_language}** : \`${guild.preferredLocale}\``
					].join("\n"),
					`-# ${lang.serverinfo_label_id} \`${guild.id}\``
				],
				images: [guild.bannerURL({ size: 1024 })],
				signature: await botSignature(client, guild.id)
			})
		);
	}
};

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
	EmbedBuilder,
	ChatInputCommandInteraction,
	Message,
	GuildMember,
	Collection,
	VoiceState,
	ColorResolvable,
	BaseGuildTextChannel
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

interface StatEntry {
	emoji: string;
	label: string;
	value: string | number;
	largeOnly?: boolean;
}

export const subCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const guild = interaction.guild;
		if (guild.members.cache.size === 0) await guild.members.fetch();

		const voiceStates = guild.voiceStates.cache;

		const mode =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getString("show-mode") || "short"
				: client.func.method.string(args!, 0) || "short";

		const isLarge = mode === "large";

		const memberStats = calculateMemberStats(guild.members.cache);
		const voiceStats = calculateVoiceStats(
			voiceStates.filter((x) => x.channelId !== null)
		);

		const totalOnline =
			memberStats.dnd + memberStats.online + memberStats.idle;

		let dominant_color = "#010101";
		try {
			dominant_color = (
				await client.func.image_dominant_color(
					guild.iconURL({ size: 4096, extension: "png" }) || ""
				)
			).color1;
		} catch {}

		const stats: StatEntry[] = [
			{
				emoji: client.iHorizon_Emojis.Server_Stats,
				label: lang.var_member,
				value: guild.memberCount.toString()
			},
			{
				emoji: client.iHorizon_Emojis.VC_Limit,
				label: lang.var_online,
				value: totalOnline
			},
			{
				emoji: client.iHorizon_Emojis.Desktop_Online,
				label: lang.var_online_call,
				value: voiceStats.total
			},
			{
				emoji: client.iHorizon_Emojis.Streaming,
				label: lang.var_stream,
				value: voiceStats.streaming
			},
			{
				emoji: client.iHorizon_Emojis.Server_Booster,
				label: lang.var_boosts,
				value: guild.premiumSubscriptionCount?.toString() || "0"
			},
			{
				emoji: client.iHorizon_Emojis.Camera,
				label: lang.var_camera,
				value: voiceStats.selfVideo,
				largeOnly: true
			},
			{
				emoji: client.iHorizon_Emojis.Mute,
				label: lang.var_muted,
				value: voiceStats.selfDeaf,
				largeOnly: true
			}
		];

		let description = "";
		stats.forEach((stat) => {
			if (stat.largeOnly && !isLarge) return;

			description += isLarge
				? `${stat.emoji}  ${stat.label} : **${stat.value}**\n`
				: `${stat.label} : **${stat.value}**\n`;
		});

		const embed = new EmbedBuilder()
			.setTitle(`${guild.name} ${lang.var_vc_stats} !`)
			.setColor(dominant_color as ColorResolvable)
			.setDescription(description.trim())
			.setThumbnail(guild.iconURL({ size: 4096 }));

		await (interaction.channel as BaseGuildTextChannel).send({
			embeds: [embed]
		});

		if (interaction instanceof ChatInputCommandInteraction) {
			await interaction.reply({
				content: `${client.iHorizon_Emojis.GreenTick}`,
				ephemeral: true
			});
		}
	}
};

interface MemberStats {
	total: number;
	online: number;
	idle: number;
	dnd: number;
	invisible: number;
}

interface VoiceStats {
	total: number;
	streaming: number;
	selfDeaf: number;
	selfMute: number;
	selfVideo: number;
}

function calculateMemberStats(
	members: Collection<string, GuildMember>
): MemberStats {
	const stats = {
		total: members.size,
		online: 0,
		idle: 0,
		dnd: 0,
		invisible: 0
	};

	members.forEach((member) => {
		const status = member.presence?.status;
		switch (status) {
			case "online":
				stats.online++;
				break;
			case "idle":
				stats.idle++;
				break;
			case "dnd":
				stats.dnd++;
				break;
			default:
				stats.invisible++;
				break;
		}
	});

	return stats;
}

function calculateVoiceStats(
	voiceStates: Collection<string, VoiceState>
): VoiceStats {
	// Making a set with userid
	const data = new Set(voiceStates.keys());
	return {
		total: data.size,
		streaming: voiceStates.filter((vc) => vc.streaming).size,
		selfDeaf: voiceStates.filter((vc) => vc.selfDeaf).size,
		selfMute: voiceStates.filter((vc) => vc.selfMute).size,
		selfVideo: voiceStates.filter((vc) => vc.selfVideo).size
	};
}

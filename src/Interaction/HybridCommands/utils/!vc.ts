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
	ChatInputCommandInteraction,
	Message,
	GuildMember,
	Collection,
	VoiceState,
	BaseGuildTextChannel
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload
} from "../../../core/modules/uiCard.js";

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

		// The icon's dominant colour, as before; the default accent otherwise.
		let accent: number = ACCENT.info;
		try {
			const color = (
				await client.func.image_dominant_color(
					guild.iconURL({ size: 4096, extension: "png" }) || ""
				)
			).color1;
			const parsed = parseInt(String(color).replace("#", ""), 16);
			if (!Number.isNaN(parsed)) accent = parsed;
		} catch {}

		const stats: StatEntry[] = [
			{
				emoji: client.iHorizon_Emojis.Server_Stats,
				label: lang.vc_label_members,
				value: guild.memberCount.toString()
			},
			{
				emoji: client.iHorizon_Emojis.VC_Limit,
				label: lang.vc_label_online,
				value: totalOnline
			},
			{
				emoji: client.iHorizon_Emojis.Desktop_Online,
				label: lang.vc_label_in_voice,
				value: voiceStats.total
			},
			{
				emoji: client.iHorizon_Emojis.Streaming,
				label: lang.vc_label_streaming,
				value: voiceStats.streaming
			},
			{
				emoji: client.iHorizon_Emojis.Server_Booster,
				label: lang.vc_label_boosts,
				value: guild.premiumSubscriptionCount?.toString() || "0"
			},
			{
				emoji: client.iHorizon_Emojis.Camera,
				label: lang.vc_label_camera,
				value: voiceStats.selfVideo,
				largeOnly: true
			},
			{
				emoji: client.iHorizon_Emojis.Mute,
				label: lang.vc_label_muted,
				value: voiceStats.selfMute,
				largeOnly: true
			}
		];

		const container = buildCard({
			accent,
			emoji: client.iHorizon_Emojis.Voice_Channel,
			title: lang.vc_card_title,
			description: `-# ${guild.name}`,
			thumbnail: guild.iconURL({ size: 256 }),
			fields: stats
				.filter((stat) => isLarge || !stat.largeOnly)
				.map((stat) => ({
					emoji: stat.emoji,
					label: stat.label,
					value: `\`${stat.value}\``
				})),
			signature: await botSignature(client, guild.id)
		});

		await (interaction.channel as BaseGuildTextChannel).send(
			cardPayload(container)
		);

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

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

import { Client, EmbedBuilder, Guild, VoiceChannel } from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";
import logger from "../logger.js";

type FloweryVoice = {
	id: string;
	name: string;
	source: string;
	language: {
		code: string;
		name: string;
	};
};

const LANGUAGE_CODES = {
	fr: ["fr-FR", "fr-CA"],
	en: ["en-US", "en-GB", "en-AU"],
	pt: ["pt-BR", "pt-PT"],
	ru: ["ru-RU"],
	de: ["de-DE"],
	es: ["es-ES", "es-MX"],
	it: ["it-IT"],
	ja: ["ja-JP"],
	ar: ["ar-SA", "ar-XA", "ar-EG"]
} as const;

const LOCALE_TO_LANG: Record<string, keyof typeof LANGUAGE_CODES> = {
	"fr-FR": "fr",
	"fr-ME": "fr",
	"en-US": "en",
	"de-DE": "de",
	"es-ES": "es",
	"it-IT": "it",
	"jp-JP": "ja",
	"pt-PT": "pt",
	"ru-RU": "ru",
	"ar-EG": "ar"
};

type VoiceMapping = Record<
	keyof typeof LANGUAGE_CODES,
	FloweryVoice | undefined
>;

let voiceMappingCache: VoiceMapping | null = null;
let voiceMappingPromise: Promise<VoiceMapping> | null = null;

export async function prefetchFloweryVoices(): Promise<void> {
	try {
		await getFloweryVoiceMapping();
		logger.log("Flowery voices cache populated successfully");
	} catch {
		// Silently fail, speakTTS will fall back
	}
}

async function getFloweryVoiceMapping(): Promise<VoiceMapping> {
	if (voiceMappingCache) return voiceMappingCache;

	if (voiceMappingPromise) return voiceMappingPromise;

	voiceMappingPromise = fetch("https://api.flowery.pw/v1/tts/voices", {
		headers: { "User-Agent": "iHorizon-Discord-Bot/1.0" }
	})
		.then(async (res) => {
			if (!res.ok) throw new Error(`Flowery API returned ${res.status}`);

			const data = (await res.json()) as { voices: FloweryVoice[] };
			const voices = data.voices;

			const mapping = {} as VoiceMapping;
			for (const lang of Object.keys(
				LANGUAGE_CODES
			) as (keyof typeof LANGUAGE_CODES)[]) {
				const codes = LANGUAGE_CODES[lang] as readonly string[];
				mapping[lang] =
					voices.find(
						(voice) =>
							codes.includes(voice.language.code) &&
							voice.source === "Microsoft Azure"
					) ??
					voices.find(
						(voice) =>
							codes.includes(voice.language.code) &&
							voice.source === "Google Translate"
					) ??
					voices.find((voice) => codes.includes(voice.language.code));
			}

			voiceMappingCache = mapping;
			return mapping;
		})
		.catch((err) => {
			voiceMappingPromise = null;
			logger.err(`Failed to fetch Flowery voices: ${err}`);
			throw err;
		});

	return voiceMappingPromise;
}

function resolveFloweryVoice(
	locale: string,
	mapping: VoiceMapping
): string | null {
	const langCode = LOCALE_TO_LANG[locale];
	if (!langCode) return null;

	const voice = mapping[langCode];
	return voice?.id ?? null;
}

export function getTTSDataPath(guildId: string): string {
	return `${guildId}.GUILD.TTS`;
}

export async function getTTSData(
	client: Client,
	guildId: string
): Promise<DatabaseStructure.TTSData | null> {
	const data = (await client.db.get(
		getTTSDataPath(guildId)
	)) as DatabaseStructure.TTSData | null;
	if (!data || !data.enabled) return null;
	return data;
}

export async function setTTSData(
	client: Client,
	guildId: string,
	data: DatabaseStructure.TTSData
): Promise<void> {
	await client.db.set(getTTSDataPath(guildId), data);
}

export async function deleteTTSData(
	client: Client,
	guildId: string
): Promise<void> {
	await client.db.delete(getTTSDataPath(guildId));
}

export async function cleanupTTS(
	client: Client,
	guildId: string
): Promise<void> {
	const data = await getTTSData(client, guildId);
	if (!data) return;

	const player = client.player.getPlayer(guildId);
	if (player) {
		player.destroy().catch(() => {});
	}

	try {
		const guild = client.guilds.cache.get(guildId);
		if (guild && data.textChannelId) {
			const channel = guild.channels.cache.get(data.textChannelId) as
				| VoiceChannel
				| undefined;
			if (channel && data.embedMessageId) {
				await channel.messages
					.delete(data.embedMessageId)
					.catch(() => {});
			}
		}
	} catch {
		// Channel or message no longer exists, ignore
	}

	try {
		await client.func.method.changeVoiceChannelStatus(
			data.voiceChannelId,
			""
		);
	} catch {
		// Voice channel may no longer exist
	}

	await deleteTTSData(client, guildId);
}

export async function cleanupOrphanedTTS(client: Client): Promise<void> {
	for (const guild of client.guilds.cache.values()) {
		const data = await getTTSData(client, guild.id);
		if (data && data.enabled) {
			await cleanupTTS(client, guild.id);
		}
	}
}

export async function sendTTSWelcomeEmbed(
	client: Client,
	guild: Guild,
	voiceChannel: VoiceChannel,
	lang: LanguageData
): Promise<string> {
	const membersInVoice = voiceChannel.members.map((m) => m.toString());

	const embed = new EmbedBuilder()
		.setColor("#5865F2")
		.setTitle(lang.tts_embed_title)
		.setDescription(
			lang.tts_embed_description
				.replace("${voiceChannel}", voiceChannel.toString())
				.replace(
					"${members}",
					membersInVoice.length > 0
						? membersInVoice.join(", ")
						: lang.var_none
				)
		)
		.setFooter({ text: lang.tts_embed_footer })
		.setTimestamp();

	const message = await voiceChannel.send({ embeds: [embed] });
	return message.id;
}

export async function speakTTS(
	client: Client,
	guildId: string,
	text: string,
	locale: string
): Promise<void> {
	const player = client.player.getPlayer(guildId);
	if (!player || !player.connected) return;

	const sanitized = text.replace(/\s+/g, " ").trim();

	if (!sanitized) return;

	try {
		const fttsParams = new URLSearchParams();

		try {
			const mapping = await getFloweryVoiceMapping();
			const voiceId = resolveFloweryVoice(locale, mapping);
			if (voiceId) {
				fttsParams.append("voice", voiceId);
				logger.debug(
					`TTS: using voice ${voiceId} for locale ${locale}`
				);
			} else {
				logger.debug(
					`TTS: no voice found for locale ${locale}, using default`
				);
			}
		} catch {
			logger.debug(`TTS: voice mapping unavailable, using default voice`);
		}

		const response = await player.search(
			{
				query: `${encodeURIComponent(sanitized)}${fttsParams.size ? `?${fttsParams.toString()}` : ""}`,
				source: "ftts"
			},
			client.user
		);

		if (!response || !response.tracks?.length) {
			logger.debug(
				`TTS: no tracks returned for "${sanitized}" in guild ${guildId}`
			);
			return;
		}

		player.queue.add(response.tracks[0]);

		if (!player.playing) {
			await player.play();
		}
	} catch (err) {
		logger.err(`TTS speak error in guild ${guildId}: ${err}`);
	}
}

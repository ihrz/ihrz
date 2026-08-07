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

import { Client, Message } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { getTTSData, speakTTS } from "../../core/modules/ttsManager.js";
import logger from "../../core/logger.js";

const DETECTORS: Array<{ regex: RegExp; locale: string }> = [
	{ regex: /[а-яА-ЯёЁ]/g, locale: "ru-RU" },
	{ regex: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, locale: "jp-JP" },
	{ regex: /[\uAC00-\uD7AF]/g, locale: "jp-JP" },
	{ regex: /[\u0600-\u06FF\u0590-\u05FF]/g, locale: "ar-EG" }
];

function detectMessageLocale(text: string): string | null {
	const cleaned = text.replace(/[\s\p{P}]/gu, "");
	if (cleaned.length === 0) return null;

	for (const detector of DETECTORS) {
		const matches = cleaned.match(detector.regex);
		if (matches && matches.length >= cleaned.length * 0.4) {
			return detector.locale;
		}
	}

	return null;
}

async function getServerLocale(
	client: Client,
	guildId: string
): Promise<string | null> {
	const serverLang = (await client.db.get(`${guildId}.GUILD.LANG.lang`)) as
		| string
		| null;
	return serverLang || null;
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (!message.guild || message.author.bot) return;

		const ttsData = await getTTSData(client, message.guild.id);
		if (!ttsData || !ttsData.enabled) return;

		if (message.channel.id !== ttsData.textChannelId) return;

		const member = message.member;
		if (!member) return;

		const voiceChannel = message.guild.channels.cache.get(
			ttsData.voiceChannelId
		);
		if (!voiceChannel || !voiceChannel.isVoiceBased()) return;

		const isInVoice = voiceChannel.members.has(member.id);
		if (!isInVoice) return;

		const text = message.cleanContent;
		if (!text || text.length === 0) return;

		if (text.length > 500) return;

		const detectedLocale = detectMessageLocale(text);
		const serverLocale = await getServerLocale(client, message.guild.id);

		const locale =
			detectedLocale || ttsData.lang || serverLocale || "en-US";

		await speakTTS(client, message.guild.id, text, locale);
	}
};

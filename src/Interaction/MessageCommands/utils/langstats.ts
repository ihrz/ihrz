/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	BaseGuildTextChannel,
	ChannelType,
	Client,
	EmbedBuilder,
	Message,
	time,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { isNumber } from '../../../core/functions/method.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';


export const command: Command = {
	name: "langstats",

	description: "Get statistics about the lang in the iHorizon Discord Bot",
	description_localizations: {
		"fr": "Obtenir des informations sur l'utilisation des langues à travers tout les serveur discord du bot iHorizon"
	},

	aliases: [],

	thinking: false,
	type: "PREFIX_IHORIZON_COMMAND",

	permission: null,

	category: "owner",
	run: async (client: Client, message: Message<true>, lang: LanguageData, options?: string[]) => {
		let tableOwner = client.db.table('OWNER');

		if (!await tableOwner.get(`${message.author.id}.owner`)) {
			await client.func.method.interactionSend(message, { content: lang.blacklist_not_owner });
			return;
		};

		let database_entry = await client.db.all();
		let all_JSON_guild_data = database_entry.filter(x => isNumber(x.id));

		const allLangsStats: Record<string, number> = {};

		for (let guild of all_JSON_guild_data) {
			let guildId = guild.id;
			let guildData = guild.value as DatabaseStructure.DbInId;
			let lang = guildData?.GUILD?.LANG?.lang || "en-US";
			if (allLangsStats[lang]) {
				allLangsStats[lang] = (allLangsStats[lang] + 1);
			} else {
				allLangsStats[lang] = 1;
			}
		}

		const all_supported_languages = {
			"ar-EG": "🇪🇬",
			"de-DE": "🇩🇪",
			"en-US": "🇺🇸🇬🇧",
			"fr-FR": "🇫🇷",
			"fr-ME": "💥🇫🇷",
			"en-ES": "🇪🇸",
			"pt-PT": "🇵🇹",
			"ru-RU": "🇷🇺",
			"jp-JP": "🇯🇵",
			"it-IT": "🇮🇹",
		} as const;

		type SupportedLang = keyof typeof all_supported_languages;

		const lines = Object
			.entries(allLangsStats)
			.map(([code, count]) => {
				const flag = all_supported_languages[code as SupportedLang] ?? "❔";
				return `${flag}\n - **${code}** → ${count}`;
			})
			.join('\n');

		client.func.method.interactionSend(message, {
			content: `> __**⭐️ Lang Stats**__
${lines}`
		})
	},
};

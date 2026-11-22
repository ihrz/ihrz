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
	ApplicationCommandType,
	ApplicationCommandOptionType,
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "antispam",

	description: "Subcommand for antispam category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie d'antispam",
		ja: "アンチスパムカテゴリのサブコマンド！",
		ru: "Подкоманда для категории антиспама!",
		"es-ES": "Subcomando para la categoría antispam!",
		ko: "스팸 방지 하위 명령어!",
		uk: "Підкоманда категорії антиспаму!",
		de: "Unterbefehle der Antispam-Kategorie!",
		it: "Sottocomandi della categoria antispam!",
		"pt-BR": "Subcomandos da categoria antispam!",
		pl: "Podkomendy kategorii antyspam!"
	},

	options: [
		{
			name: "manage",
			prefixName: "antispam-manage",

			description: "Manage the antispam module",
			description_localizations: {
				fr: "Gérer le module antispam",
				ja: "アンチスパムモジュールを管理",
				ru: "Управление модулем антиспама",
				"es-ES": "Gestionar el módulo antispam",
				ko: "스팸 방지 모듈 관리",
				uk: "Керування модулем антиспаму",
				de: "AntiSpam-Modul verwalten",
				it: "Gestisci il modulo antispam",
				"pt-BR": "Gerencie o módulo antispam",
				pl: "Zarządzaj modułem antyspamowym"
			},

			aliases: ["mng", "antimng"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "bypass-roles",
			prefixName: "antispam-bypass-roles",

			description: "All of the roles wich bypass the antispam",
			description_localizations: {
				fr: "Tous les rôles qui contournent l'anti spam",
				ja: "アンチスパムをバイパスする全てのロール",
				ru: "Все роли, обходящие антиспам",
				"es-ES": "Todos los roles que evitan el antispam",
				ko: "스팸 방지를 우회하는 모든 역할",
				uk: "Усі ролі, що обходять антиспам",
				de: "Alle Rollen, die den Antispam umgehen",
				it: "Tutti i ruoli che ignorano l'antispam",
				"pt-BR": "Todos os cargos que ignoram o antispam",
				pl: "Wszystkie role pomijające antyspam"
			},

			aliases: ["bproles"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "ignore-channels",
			prefixName: "antispam-ignore-channels",

			description: "Ignore this channels in the AntiSpam Module",
			description_localizations: {
				fr: "Ignorer des salons afin que l'AntiSpam ne l'ai prennent pas en compte",
				ja: "アンチスパムモジュールでこのチャンネルを無視",
				ru: "Игнорировать эти каналы в модуле антиспама",
				"es-ES": "Ignorar estos canales en el módulo AntiSpam",
				ko: "스팸 방지 모듈에서 무시할 채널",
				uk: "Ігнорувати ці канали в модулі антиспаму",
				de: "Diese Kanäle im AntiSpam-Modul ignorieren",
				it: "Ignora questi canali nel modulo AntiSpam",
				"pt-BR": "Ignorar estes canais no módulo AntiSpam",
				pl: "Ignoruj te kanały w module AntiSpam"
			},

			aliases: ["channels"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],
	category: "antispam",
	thinking: true,
	type: ApplicationCommandType.ChatInput,
	permission: null
};

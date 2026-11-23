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
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "setsuggest",

	description: "Subcommand for suggestion category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de suggestion",
		ja: "提案カテゴリのサブコマンド！",
		ru: "Подкоманда для категории предложений!",
		"es-ES": "Subcomando para la categoría de sugerencias!",
		ko: "건의 하위 명령어!",
		uk: "Підкоманда для категорії пропозицій!",
		de: "Unterbefehle der Vorschlags-Kategorie!",
		it: "Sottocomandi della categoria suggerimenti!",
		"pt-BR": "Subcomandos da categoria sugestões!",
		pl: "Podkomendy kategorii sugestii!"
	},

	options: [
		{
			name: "config",
			prefixName: "suggest-config",

			description:
				"Disable the suggestion module (need admin permission)!",
			description_localizations: {
				fr: "Désactivez le module de suggestion (besoin de l'autorisation de l'administrateur)",
				ja: "提案モジュールを無効化（管理者権限が必要）！",
				ru: "Отключить модуль предложений (требуются права администратора)!",
				"es-ES":
					"Deshabilitar el módulo de sugerencias (requiere permiso de administrador)!",
				ko: "건의 모듈을 비활성화해요 (관리자 권한 필요)!",
				uk: "Вимкнути модуль пропозицій (потрібні права адміністратора)!",
				de: "Vorschlagsmodul deaktivieren (Admin-Recht nötig)!",
				it: "Disattiva il modulo suggerimenti (servono permessi admin)!",
				"pt-BR":
					"Desative o módulo de sugestões (requer permissão de admin)!",
				pl: "Wyłącz moduł sugestii (wymaga uprawnień admina)!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What you want to do ?",
					description_localizations: {
						fr: "Que veux-tu faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					required: true,
					choices: [
						{
							name: "Power On the Suggestion Module",
							name_localizations: {
								fr: "Activer le module de suggestion",
								ja: "power_on_the_suggestion_module",
								ru: "power_on_the_suggestion_module",
								"es-ES": "power_on_the_suggestion_module",
								ko: "건의 모듈 켜기",
								uk: "Увімкнути модуль пропозицій",
								de: "Vorschlagsmodul einschalten",
								it: "Attiva il modulo suggerimenti",
								"pt-BR": "Ligar o módulo de sugestões",
								pl: "Włącz moduł sugestii"
							},
							value: "on"
						},
						{
							name: "Power Off the Suggestion Module",
							name_localizations: {
								fr: "Désactiver le module de suggestion",
								ja: "power_off_the_suggestion_module",
								ru: "power_off_the_suggestion_module",
								"es-ES": "power_off_the_suggestion_module",
								ko: "건의 모듈 끄기",
								uk: "Вимкнути модуль пропозицій",
								de: "Vorschlagsmodul ausschalten",
								it: "Disattiva il modulo suggerimenti",
								"pt-BR": "Desligar o módulo de sugestões",
								pl: "Wyłącz moduł sugestii"
							},
							value: "off"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "channel",
			prefixName: "suggest-channel",

			description:
				"Set a channel for the Suggestion Module (need admin permission)!",
			description_localizations: {
				fr: "Définir un canal pour le module de suggestion (nécessite une autorisation d'administrateur)",
				ja: "提案モジュール用のチャンネルを設定（管理者権限が必要）！",
				ru: "Установить канал для модуля предложений (требуются права администратора)!",
				"es-ES":
					"Establecer un canal para el módulo de sugerencias (requiere permiso de administrador)!",
				ko: "건의 모듈 채널을 설정해요 (관리자 권한 필요)!",
				uk: "Встановити канал для модуля пропозицій (потрібні права адміністратора)!",
				de: "Legt einen Kanal für das Vorschlagsmodul fest (Admin-Recht nötig)!",
				it: "Imposta un canale per il modulo Suggerimenti (serve il permesso admin)!",
				"pt-BR":
					"Define um canal para o módulo de Sugestões (requer permissão de admin)!",
				pl: "Ustawia kanał modułu sugestii (wymaga uprawnień administratora)!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					description: "What the channel for the suggestion place?",
					description_localizations: {
						fr: "Quel est le channel pour le lieu de suggestion ?",
						ja: "提案を設置するチャンネルは？",
						ru: "Какой канал для размещения предложений?",
						"es-ES":
							"Cual es el canal para colocar las sugerencias?",
						ko: "건의를 받을 채널은 어디인가요?",
						uk: "Який канал для пропозицій?",
						de: "Welcher Kanal für die Vorschläge?",
						it: "Quale canale per i suggerimenti?",
						"pt-BR": "Qual canal para as sugestões?",
						pl: "Który kanał na sugestie?"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "staff-role",
			prefixName: "suggest-staff-role",

			description:
				"Set the role allowed to manage suggestions, or clear it!",
			description_localizations: {
				fr: "Définir le rôle autorisé à gérer les suggestions, ou le retirer",
				ja: "提案を管理できるロールを設定または解除！",
				ru: "Назначить или убрать роль для управления предложениями!",
				"es-ES":
					"Definir o quitar el rol que gestiona las sugerencias!",
				ko: "건의를 관리할 수 있는 역할을 설정하거나 지워요!",
				uk: "Встановити або прибрати роль для керування пропозиціями!",
				de: "Legt die Rolle zur Verwaltung von Vorschlägen fest oder entfernt sie!",
				it: "Imposta il ruolo che gestisce i suggerimenti, o rimuovilo!",
				"pt-BR": "Define o cargo que gerencia sugestões, ou o remove!",
				pl: "Ustawia rolę zarządzającą sugestiami lub ją usuwa!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "The staff role, leave empty to clear it",
					description_localizations: {
						fr: "Le rôle staff, laisser vide pour le retirer",
						ja: "スタッフロール（空欄で解除）",
						ru: "Роль персонала, оставьте пустым, чтобы убрать",
						"es-ES": "El rol de staff, déjalo vacío para quitarlo",
						ko: "스태프 역할 (비우면 지워요)",
						uk: "Роль персоналу; залиште порожнім, щоб прибрати",
						de: "Die Team-Rolle; leer lassen zum Entfernen",
						it: "Il ruolo staff; lascia vuoto per rimuoverlo",
						"pt-BR":
							"O cargo da equipe; deixe vazio para removê-lo",
						pl: "Rola staffu; zostaw puste, aby usunąć"
					},

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "suggestion",
	type: ApplicationCommandType.ChatInput,

	permission: null
};

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

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "confession",

	description: "Subcommand for confession category!",
	description_localizations: {
		fr: "Commande sous-groupé pour le module de confession",
		ja: "告白カテゴリのサブコマンド！",
		ru: "Подкоманда для категории признаний!",
		"es-ES": "Subcomando para la categoría de confesiones!",
		ko: "고백 하위 명령어!",
		uk: "Підкоманда категорії зізнань!",
		de: "Unterbefehle der Geständnis-Kategorie!",
		it: "Sottocomandi della categoria confessioni!",
		"pt-BR": "Subcomandos da categoria confissões!",
		pl: "Podkomendy kategorii wyznań!"
	},

	options: [
		{
			name: "channel",
			prefixName: "confess-channel",

			description: "Set the confession module's channel!",
			description_localizations: {
				fr: "Définir le canal du module confession",
				ja: "告白モジュールのチャンネルを設定！",
				ru: "Установить канал модуля признаний!",
				"es-ES": "Establecer el canal del módulo de confesiones!",
				ko: "고백 모듈 채널을 설정해요!",
				uk: "Встановити канал модуля зізнань!",
				de: "Legt den Kanal des Geständnis-Moduls fest!",
				it: "Imposta il canale del modulo confessioni!",
				"pt-BR": "Define o canal do módulo de confissões!",
				pl: "Ustawia kanał modułu wyznań!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,

					description: "The channel!",
					description_localizations: {
						fr: "Le channel",
						ja: "チャンネル！",
						ru: "Канал!",
						"es-ES": "El canal!",
						ko: "채널!",
						uk: "Канал!",
						de: "Der Kanal!",
						it: "Il canale!",
						"pt-BR": "O canal!",
						pl: "Kanał!"
					},

					channel_types: [ChannelType.GuildText],

					required: true,

					permission: null
				},
				{
					name: "button-title",
					type: ApplicationCommandOptionType.String,

					description: "The button title",
					description_localizations: {
						fr: "Le titre du bouton",
						ja: "ボタンのタイトル",
						ru: "Название кнопки",
						"es-ES": "El título del botón",
						ko: "버튼 제목",
						uk: "Назва кнопки",
						de: "Der Button-Titel",
						it: "Il titolo del pulsante",
						"pt-BR": "O título do botão",
						pl: "Tytuł przycisku"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "config",
			prefixName: "confess-config",

			description: "Enable or Disable the confession module!",
			description_localizations: {
				fr: "Activer ou désactiver le module",
				ja: "告白モジュールを有効化または無効化！",
				ru: "Включить или отключить модуль признаний!",
				"es-ES": "Habilitar o Deshabilitar el módulo de confesiones!",
				ko: "고백 모듈을 켜거나 꺼요!",
				uk: "Увімкнути або вимкнути модуль зізнань!",
				de: "Geständnis-Modul aktivieren oder deaktivieren!",
				it: "Attiva o disattiva il modulo confessioni!",
				"pt-BR": "Ative ou desative o módulo de confissões!",
				pl: "Włącz lub wyłącz moduł wyznań!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
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
							name: "Power On",
							name_localizations: {
								fr: "Activer",
								ja: "power_on",
								ru: "power_on",
								"es-ES": "power_on",
								ko: "켜기",
								uk: "Увімкнути",
								de: "Einschalten",
								it: "Attiva",
								"pt-BR": "Ligar",
								pl: "Włącz"
							},
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: {
								fr: "Désactiver",
								ja: "power_off",
								ru: "power_off",
								"es-ES": "power_off",
								ko: "끄기",
								uk: "Вимкнути",
								de: "Ausschalten",
								it: "Disattiva",
								"pt-BR": "Desligar",
								pl: "Wyłącz"
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
			name: "thread",
			prefixName: "confthread",

			description: "Create an thread upside the confession ?",
			description_localizations: {
				fr: "Créer un fil de discussion en dessous de la confession ?",
				ja: "告白の上にスレッドを作成しますか？",
				ru: "Создать ветку над признанием?",
				"es-ES": "Crear un hilo encima de la confesión?",
				ko: "고백 위에 스레드를 만들까요?",
				uk: "Створювати гілку під зізнанням?",
				de: "Thread zum Geständnis erstellen?",
				it: "Creare un thread per la confessione?",
				"pt-BR": "Criar um tópico para a confissão?",
				pl: "Utworzyć wątek przy wyznaniu?"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
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
							name: "Create thread",
							name_localizations: {
								fr: "Créer un fil",
								ja: "create_thread",
								ru: "create_thread",
								"es-ES": "create_thread",
								ko: "스레드 만들기",
								uk: "Створювати гілку",
								de: "Thread erstellen",
								it: "Crea thread",
								"pt-BR": "Criar tópico",
								pl: "Utwórz wątek"
							},
							value: "yes"
						},
						{
							name: "Don´t create thread",
							name_localizations: {
								fr: "Ne pas créer un fil",
								ja: "don_t_create_thread",
								ru: "don_t_create_thread",
								"es-ES": "don_t_create_thread",
								ko: "스레드 만들지 않기",
								uk: "Не створювати гілку",
								de: "Keinen Thread erstellen",
								it: "Non creare thread",
								"pt-BR": "Não criar tópico",
								pl: "Nie twórz wątku"
							},
							value: "no"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "cooldown",
			prefixName: "confess-cooldown",

			description: "Change the cooldown between confession!",
			description_localizations: {
				fr: "Changer le cooldown entre les confession",
				ja: "告白間のクールダウンを変更！",
				ru: "Изменить задержку между признаниями!",
				"es-ES": "Cambiar el enfriamiento entre confesiones!",
				ko: "고백 사이의 쿨다운을 변경해요!",
				uk: "Змінити затримку між зізнаннями!",
				de: "Ändere die Wartezeit zwischen Geständnissen!",
				it: "Cambia il tempo di attesa tra le confessioni!",
				"pt-BR": "Altere o intervalo entre confissões!",
				pl: "Zmień czas oczekiwania między wyznaniami!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "time",
					type: ApplicationCommandOptionType.String,

					description: "Coolodwn's time like 3h/30m/10s...",
					description_localizations: {
						fr: "Le temps comme 3h/30m/10s...",
						ja: "クールダウン時間（例: 3h/30m/10s...）",
						ru: "Время задержки, например 3ч/30м/10с...",
						"es-ES": "Tiempo de enfriamiento como 3h/30m/10s...",
						ko: "쿨다운 시간 (예: 3h/30m/10s...)",
						uk: "Тривалість затримки, наприклад 3h/30m/10s...",
						de: "Wartezeit, z. B. 3h/30m/10s...",
						it: "Tempo di attesa, es. 3h/30m/10s...",
						"pt-BR": "Tempo de espera, ex.: 3h/30m/10s...",
						pl: "Czas oczekiwania, np. 3h/30m/10s..."
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "delete",
			prefixName: "confess-delete",

			description: "Delete a confession!",
			description_localizations: {
				fr: "Supprimer une confession",
				ja: "告白を削除！",
				ru: "Удалить признание!",
				"es-ES": "Eliminar una confesión!",
				ko: "고백을 삭제해요!",
				uk: "Видалити зізнання!",
				de: "Lösche ein Geständnis!",
				it: "Elimina una confessione!",
				"pt-BR": "Exclua uma confissão!",
				pl: "Usuń wyznanie!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "code",
					type: ApplicationCommandOptionType.String,

					description: "The confession code",
					description_localizations: {
						fr: "Le code de la confession",
						ja: "告白コード",
						ru: "Код признания",
						"es-ES": "El código de la confesión",
						ko: "고백 코드",
						uk: "Код зізнання",
						de: "Der Geständnis-Code",
						it: "Il codice della confessione",
						"pt-BR": "O código da confissão",
						pl: "Kod wyznania"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "ban",
			prefixName: "confess-ban",

			description:
				"Ban the author of a confession from the module, without revealing them!",
			description_localizations: {
				fr: "Bannir du module l'auteur d'une confession, sans le révéler",
				ja: "告白の投稿者を明かさずにモジュールから追放！",
				ru: "Заблокировать автора признания, не раскрывая его!",
				"es-ES":
					"Banear del módulo al autor de una confesión, sin revelarlo!",
				ko: "고백 작성자를 공개하지 않고 모듈에서 차단해요!",
				uk: "Заблокувати автора зізнання в модулі, не розкриваючи його!",
				de: "Banne den Autor eines Geständnisses vom Modul, ohne ihn zu enttarnen!",
				it: "Banna dal modulo l'autore di una confessione, senza rivelarlo!",
				"pt-BR":
					"Bana do módulo o autor de uma confissão, sem revelá-lo!",
				pl: "Zbanuj autora wyznania w module, bez ujawniania go!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "code",
					type: ApplicationCommandOptionType.String,

					description: "The confession code",
					description_localizations: {
						fr: "Le code de la confession",
						ja: "告白コード",
						ru: "Код признания",
						"es-ES": "El código de la confesión",
						ko: "고백 코드",
						uk: "Код зізнання",
						de: "Der Geständnis-Code",
						it: "Il codice della confessione",
						"pt-BR": "O código da confissão",
						pl: "Kod wyznania"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unban",
			prefixName: "confess-unban",

			description:
				"Lift a ban, using the code of the confession that caused it!",
			description_localizations: {
				fr: "Lever un bannissement, avec le code de la confession concernée",
				ja: "原因となった告白コードで追放を解除！",
				ru: "Снять блокировку по коду признания!",
				"es-ES": "Levantar un baneo con el código de la confesión!",
				ko: "차단의 원인이 된 고백 코드로 차단을 해제해요!",
				uk: "Зняти бан за кодом зізнання, через яке його було накладено!",
				de: "Hebe einen Bann mit dem Code des auslösenden Geständnisses auf!",
				it: "Revoca un ban usando il codice della confessione che l'ha causato!",
				"pt-BR":
					"Revogue um banimento usando o código da confissão que o causou!",
				pl: "Zdejmij bana, używając kodu wyznania, które go wywołało!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "code",
					type: ApplicationCommandOptionType.String,

					description: "The confession code",
					description_localizations: {
						fr: "Le code de la confession",
						ja: "告白コード",
						ru: "Код признания",
						"es-ES": "El código de la confesión",
						ko: "고백 코드",
						uk: "Код зізнання",
						de: "Der Geständnis-Code",
						it: "Il codice della confessione",
						"pt-BR": "O código da confissão",
						pl: "Kod wyznania"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		}
	],
	thinking: false,
	category: "confession",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

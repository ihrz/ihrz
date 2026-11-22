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
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "gw",
	description: "Subcommand for giveaway category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de giveaway",
		ja: "ギブアウェイカテゴリのサブコマンド！",
		ru: "Подкоманда для категории розыгрышей!",
		"es-ES": "Subcomando para la categoría de sorteos!",
		ko: "경품 추첨 하위 명령어!",
		uk: "Підкоманда категорії розіграшів!",
		de: "Unterbefehle der Gewinnspiel-Kategorie!",
		it: "Sottocomandi della categoria giveaway!",
		"pt-BR": "Subcomandos da categoria sorteios!",
		pl: "Podkomendy kategorii konkursów!"
	},
	options: [
		{
			name: "create",
			name_localizations: {
				fr: "créer",
				ja: "create",
				ru: "create",
				"es-ES": "create",
				ko: "create",
				uk: "create",
				de: "create",
				it: "create",
				"pt-BR": "create",
				pl: "create"
			},
			prefixName: "gw-create",

			aliases: ["gstart", "gcreate"],

			description: "Start a giveaway!",
			description_localizations: {
				fr: "Commencer un giveaway",
				ja: "ギブアウェイを開始！",
				ru: "Начать розыгрыш!",
				"es-ES": "Iniciar un sorteo!",
				ko: "경품 추첨을 시작해요!",
				uk: "Почати розіграш!",
				de: "Startet ein Gewinnspiel!",
				it: "Avvia un giveaway!",
				"pt-BR": "Inicia um sorteio!",
				pl: "Rozpoczyna konkurs!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "winner",
					name_localizations: {
						fr: "gagnants",
						ja: "winner",
						ru: "winner",
						"es-ES": "winner",
						ko: "winner",
						uk: "winner",
						de: "winner",
						it: "winner",
						"pt-BR": "winner",
						pl: "winner"
					},

					type: ApplicationCommandOptionType.Number,

					description: "Number of winner for the giveaways",
					description_localizations: {
						fr: "Nombre de gagnants pour les cadeaux",
						ja: "ギブアウェイの当選者数",
						ru: "Количество победителей розыгрыша",
						"es-ES": "Número de ganadores del sorteo",
						ko: "경품 추첨 당첨자 수",
						uk: "Кількість переможців розіграшу",
						de: "Anzahl der Gewinner des Gewinnspiels",
						it: "Numero di vincitori del giveaway",
						"pt-BR": "Número de vencedores do sorteio",
						pl: "Liczba zwycięzców konkursu"
					},

					required: true,

					permission: null
				},
				{
					name: "time",
					name_localizations: {
						fr: "temps",
						ja: "time",
						ru: "time",
						"es-ES": "time",
						ko: "time",
						uk: "time",
						de: "time",
						it: "time",
						"pt-BR": "time",
						pl: "time"
					},

					type: ApplicationCommandOptionType.String,

					description: "The time duration of the giveaways",
					description_localizations: {
						fr: "La durée des cadeaux",
						ja: "ギブアウェイの開催時間",
						ru: "Длительность розыгрыша",
						"es-ES": "La duración del sorteo",
						ko: "경품 추첨 기간",
						uk: "Тривалість розіграшу",
						de: "Die Dauer des Gewinnspiels",
						it: "La durata del giveaway",
						"pt-BR": "A duração do sorteio",
						pl: "Czas trwania konkursu"
					},

					required: true,

					permission: null
				},
				{
					name: "requirement",

					description: "The requirement to enter into the giveaway",
					description_localizations: {
						fr: "Le prérequis pour rentrer dans le giveaways",
						ja: "ギブアウェイ参加要件",
						ru: "Требование для участия в розыгрыше",
						"es-ES": "El requisito para entrar en el sorteo",
						ko: "경품 추첨 참가 조건",
						uk: "Умова для участі в розіграші",
						de: "Voraussetzung für die Teilnahme am Gewinnspiel",
						it: "Requisito per partecipare al giveaway",
						"pt-BR": "Requisito para participar do sorteio",
						pl: "Wymaganie, by wziąć udział w konkursie"
					},

					choices: [
						{
							name: "None",
							name_localizations: {
								fr: "Aucun",
								ja: "none",
								ru: "none",
								"es-ES": "none",
								ko: "없음",
								uk: "Немає",
								de: "Keine",
								it: "Nessuno",
								"pt-BR": "Nenhum",
								pl: "Brak"
							},
							value: "none"
						},
						{
							name: "Need Specific invitations amount",
							name_localizations: {
								fr: "Besoin d'un nombre spécifique d'invitations",
								ja: "need_specific_invitations_amount",
								ru: "need_specific_invitations_amount",
								"es-ES": "need_specific_invitations_amount",
								ko: "특정 초대 수 필요",
								uk: "Потрібна певна кількість запрошень",
								de: "Bestimmte Anzahl an Einladungen nötig",
								it: "Serve un numero specifico di inviti",
								"pt-BR":
									"Requer uma quantidade específica de convites",
								pl: "Wymagana określona liczba zaproszeń"
							},
							value: "invites"
						},
						{
							name: "Need specific messages number",
							name_localizations: {
								fr: "Besoin d'un nombre spécifique de messages",
								ja: "need_specific_messages_number",
								ru: "need_specific_messages_number",
								"es-ES": "need_specific_messages_number",
								ko: "특정 메시지 수 필요",
								uk: "Потрібна певна кількість повідомлень",
								de: "Bestimmte Anzahl an Nachrichten nötig",
								it: "Serve un numero specifico di messaggi",
								"pt-BR":
									"Requer um número específico de mensagens",
								pl: "Wymagana określona liczba wiadomości"
							},
							value: "messages"
						},
						{
							name: "Need specific roles",
							name_localizations: {
								fr: "Besoin de rôles spécifiques",
								ja: "need_specific_roles",
								ru: "need_specific_roles",
								"es-ES": "need_specific_roles",
								ko: "특정 역할 필요",
								uk: "Потрібні певні ролі",
								de: "Bestimmte Rollen nötig",
								it: "Servono ruoli specifici",
								"pt-BR": "Requer cargos específicos",
								pl: "Wymagane określone role"
							},
							value: "roles"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "prize",
					name_localizations: {
						fr: "prix",
						ja: "prize",
						ru: "prize",
						"es-ES": "prize",
						ko: "prize",
						uk: "prize",
						de: "prize",
						it: "prize",
						"pt-BR": "prize",
						pl: "prize"
					},

					type: ApplicationCommandOptionType.String,

					description: "The giveaway's prize",
					description_localizations: {
						fr: "Le prix du giveaway",
						ja: "ギブアウェイの賞品",
						ru: "Приз розыгрыша",
						"es-ES": "El premio del sorteo",
						ko: "경품 추첨 상품",
						uk: "Приз розіграшу",
						de: "Der Preis des Gewinnspiels",
						it: "Il premio del giveaway",
						"pt-BR": "O prêmio do sorteio",
						pl: "Nagroda w konkursie"
					},

					required: true,

					permission: null
				},
				{
					name: "requirement-value",
					type: ApplicationCommandOptionType.String,

					description: "The requirement value",
					description_localizations: {
						fr: "La valeur du prérequis pour entrer dans le giveaway",
						ja: "要件の値",
						ru: "Значение требования",
						"es-ES": "El valor del requisito",
						ko: "조건 값",
						uk: "Значення умови",
						de: "Der Wert der Voraussetzung",
						it: "Il valore del requisito",
						"pt-BR": "O valor do requisito",
						pl: "Wartość wymagania"
					},

					required: false,

					permission: null
				},
				{
					name: "image",
					type: ApplicationCommandOptionType.String,

					description: "Image showed on the giveaway's embed",
					description_localizations: {
						fr: "le lien d'une image qui seras inclu dans l'embed du giveaway",
						ja: "ギブアウェイの埋め込みに表示される画像",
						ru: "Изображение в эмбеде розыгрыша",
						"es-ES": "Imagen mostrada en el embed del sorteo",
						ko: "경품 추첨 임베드에 표시할 이미지",
						uk: "Зображення в ембеді розіграшу",
						de: "Bild im Embed des Gewinnspiels",
						it: "Immagine mostrata nell'embed del giveaway",
						"pt-BR": "Imagem exibida no embed do sorteio",
						pl: "Obraz widoczny w embedzie konkursu"
					},

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "go",
			name_localizations: {
				fr: "go",
				ja: "go",
				ru: "go",
				"es-ES": "go",
				ko: "go",
				uk: "go",
				de: "go",
				it: "go",
				"pt-BR": "go",
				pl: "go"
			},
			prefixName: "gw-go",

			aliases: ["ggo"],

			description:
				"Open an interactive giveaway panel to configure and launch a giveaway!",
			description_localizations: {
				fr: "Ouvrir un panel interactif pour configurer et lancer un giveaway !",
				ja: "ギブアウェイを設定して開始するためのパネルを開く！",
				ru: "Открыть панель для настройки и запуска розыгрыша!",
				"es-ES":
					"Abrir un panel interactivo para configurar y lanzar un sorteo!",
				ko: "대화형 패널에서 경품 추첨을 설정하고 시작해요!",
				uk: "Відкрити інтерактивну панель, щоб налаштувати й запустити розіграш!",
				de: "Öffne ein interaktives Panel, um ein Gewinnspiel zu konfigurieren und zu starten!",
				it: "Apri un pannello interattivo per configurare e avviare un giveaway!",
				"pt-BR":
					"Abra um painel interativo para configurar e iniciar um sorteio!",
				pl: "Otwórz interaktywny panel, by skonfigurować i uruchomić konkurs!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "end",
			name_localizations: {
				fr: "finnir",
				ja: "end",
				ru: "end",
				"es-ES": "end",
				ko: "end",
				uk: "end",
				de: "end",
				it: "end",
				"pt-BR": "end",
				pl: "end"
			},
			prefixName: "gw-end",

			aliases: ["gstop", "gbreak"],

			description: "Stop a giveaway!",
			description_localizations: {
				fr: "Arrêter un giveaway",
				ja: "ギブアウェイを停止！",
				ru: "Остановить розыгрыш!",
				"es-ES": "Detener un sorteo!",
				ko: "경품 추첨을 종료해요!",
				uk: "Зупинити розіграш!",
				de: "Beendet ein Gewinnspiel!",
				it: "Interrompi un giveaway!",
				"pt-BR": "Encerra um sorteio!",
				pl: "Zatrzymuje konkurs!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",
					type: ApplicationCommandOptionType.String,

					description:
						"The giveaway id (is the message id of the embed's giveaways)",
					description_localizations: {
						fr: "L'identifiant du cadeau (est l'identifiant du message du giveaway)",
						ja: "ギブアウェイID（埋め込みギブアウェイのメッセージID）",
						ru: "ID розыгрыша (это ID сообщения эмбеда розыгрыша)",
						"es-ES":
							"El ID del sorteo (es el ID del mensaje del embed del sorteo)",
						ko: "경품 추첨 ID (경품 추첨 임베드의 메시지 ID)",
						uk: "ID розіграшу (ID повідомлення з ембедом розіграшу)",
						de: "Die Gewinnspiel-ID (= Nachrichten-ID des Gewinnspiel-Embeds)",
						it: "L'ID del giveaway (è l'ID del messaggio dell'embed)",
						"pt-BR":
							"O ID do sorteio (é o ID da mensagem do embed)",
						pl: "ID konkursu (to ID wiadomości z embedem konkursu)"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "reroll",
			name_localizations: {
				fr: "relancer",
				ja: "reroll",
				ru: "reroll",
				"es-ES": "reroll",
				ko: "reroll",
				uk: "reroll",
				de: "reroll",
				it: "reroll",
				"pt-BR": "reroll",
				pl: "reroll"
			},

			description: "Reroll a giveaway winner(s)!",
			description_localizations: {
				fr: "Relancez un ou plusieurs gagnants",
				ja: "ギブアウェイの当選者を再抽選！",
				ru: "Перевыбрать победителя(ей) розыгрыша!",
				"es-ES": "Volver a sortear ganador(es) del sorteo!",
				ko: "경품 추첨 당첨자를 다시 뽑아요!",
				uk: "Переобрати переможця(-ів) розіграшу!",
				de: "Ziehe Gewinner eines Gewinnspiels neu!",
				it: "Estrai di nuovo i vincitori di un giveaway!",
				"pt-BR": "Sorteie novamente os vencedores de um sorteio!",
				pl: "Wylosuj ponownie zwycięzców konkursu!"
			},

			aliases: ["re"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",
					type: ApplicationCommandOptionType.String,

					description:
						"The giveaway id (is the message id of the embed's giveaways)",
					description_localizations: {
						fr: "L'identifiant du cadeau (est l'identifiant du message du giveaway)",
						ja: "ギブアウェイID（埋め込みギブアウェイのメッセージID）",
						ru: "ID розыгрыша (это ID сообщения эмбеда розыгрыша)",
						"es-ES":
							"El ID del sorteo (es el ID del mensaje del embed del sorteo)",
						ko: "경품 추첨 ID (경품 추첨 임베드의 메시지 ID)",
						uk: "ID розіграшу (ID повідомлення з ембедом розіграшу)",
						de: "Die Gewinnspiel-ID (= Nachrichten-ID des Gewinnspiel-Embeds)",
						it: "L'ID del giveaway (è l'ID del messaggio dell'embed)",
						"pt-BR":
							"O ID do sorteio (é o ID da mensagem do embed)",
						pl: "ID konkursu (to ID wiadomości z embedem konkursu)"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "list-entries",
			name_localizations: {
				fr: "afficher-les-participant",
				ja: "list-entries",
				ru: "list-entries",
				"es-ES": "list-entries",
				ko: "list-entries",
				uk: "list-entries",
				de: "list-entries",
				it: "list-entries",
				"pt-BR": "list-entries",
				pl: "list-entries"
			},

			description: "List all entries in giveaway!",
			description_localizations: {
				fr: "Répertorier toutes les entrées dans le giveaway",
				ja: "ギブアウェイの全エントリーを一覧表示！",
				ru: "Показать всех участников розыгрыша!",
				"es-ES": "Listar todas las entradas en el sorteo!",
				ko: "경품 추첨의 모든 참가자 목록을 확인해요!",
				uk: "Показати всіх учасників розіграшу!",
				de: "Alle Teilnahmen am Gewinnspiel auflisten!",
				it: "Elenca tutte le partecipazioni al giveaway!",
				"pt-BR": "Liste todas as participações no sorteio!",
				pl: "Wyświetl wszystkich uczestników konkursu!"
			},

			aliases: ["list"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",
					type: ApplicationCommandOptionType.String,

					description:
						"The giveaway id (is the message id of the embed's giveaways)",
					description_localizations: {
						fr: "L'identifiant du cadeau (est l'identifiant du message du giveaway)",
						ja: "ギブアウェイID（埋め込みギブアウェイのメッセージID）",
						ru: "ID розыгрыша (это ID сообщения эмбеда розыгрыша)",
						"es-ES":
							"El ID del sorteo (es el ID del mensaje del embed del sorteo)",
						ko: "경품 추첨 ID (경품 추첨 임베드의 메시지 ID)",
						uk: "ID розіграшу (ID повідомлення з ембедом розіграшу)",
						de: "Die Gewinnspiel-ID (= Nachrichten-ID des Gewinnspiel-Embeds)",
						it: "L'ID del giveaway (è l'ID del messaggio dell'embed)",
						"pt-BR":
							"O ID do sorteio (é o ID da mensagem do embed)",
						pl: "ID konkursu (to ID wiadomości z embedem konkursu)"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "get-data",
			name_localizations: {
				fr: "get-data",
				ja: "get-data",
				ru: "get-data",
				"es-ES": "get-data",
				ko: "get-data",
				uk: "get-data",
				de: "get-data",
				it: "get-data",
				"pt-BR": "get-data",
				pl: "get-data"
			},

			description: "Get informations about a giveaway (JSON Body)",
			description_localizations: {
				fr: "Obtenir des informations à propos d'un giveaways! (Format JSON)",
				ja: "ギブアウェイの情報を取得（JSONデータ）",
				ru: "Получить информацию о розыгрыше (JSON)",
				"es-ES": "Obtener información sobre un sorteo (cuerpo JSON)",
				ko: "경품 추첨 정보를 확인해요 (JSON 본문)",
				uk: "Отримати інформацію про розіграш (тіло JSON)",
				de: "Infos zu einem Gewinnspiel anzeigen (JSON)",
				it: "Ottieni informazioni su un giveaway (JSON)",
				"pt-BR": "Veja informações sobre um sorteio (JSON)",
				pl: "Pokaż informacje o konkursie (JSON)"
			},

			aliases: ["get"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",

					description: "Giveaway's ID",
					description_localizations: {
						fr: "L'identifiant du giveaways",
						ja: "ギブアウェイのID",
						ru: "ID розыгрыша",
						"es-ES": "ID del sorteo",
						ko: "경품 추첨 ID",
						uk: "ID розіграшу",
						de: "Gewinnspiel-ID",
						it: "ID del giveaway",
						"pt-BR": "ID do sorteio",
						pl: "ID konkursu"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "get-all",
			name_localizations: {
				fr: "get-all",
				ja: "get-all",
				ru: "get-all",
				"es-ES": "get-all",
				ko: "get-all",
				uk: "get-all",
				de: "get-all",
				it: "get-all",
				"pt-BR": "get-all",
				pl: "get-all"
			},

			description:
				"Get informations about all giveaways in a guild (JSON Body)",
			description_localizations: {
				fr: "Obtenir des informations à propos de tout les giveaways d'un serveur! (Format JSON)",
				ja: "サーバー内の全ギブアウェイの情報を取得（JSONデータ）",
				ru: "Получить информацию о всех розыгрышах на сервере (JSON)",
				"es-ES":
					"Obtener información sobre todos los sorteos en un servidor (cuerpo JSON)",
				ko: "서버의 모든 경품 추첨 정보를 확인해요 (JSON 본문)",
				uk: "Отримати інформацію про всі розіграші сервера (тіло JSON)",
				de: "Infos zu allen Gewinnspielen eines Servers anzeigen (JSON)",
				it: "Ottieni informazioni su tutti i giveaway di un server (JSON)",
				"pt-BR":
					"Veja informações sobre todos os sorteios de um servidor (JSON)",
				pl: "Pokaż informacje o wszystkich konkursach serwera (JSON)"
			},

			aliases: ["gall"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageMessages
		}
	],
	thinking: true,
	category: "giveaway",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

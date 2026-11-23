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
	name: "util",

	description: "SubCommand category for utils command",
	description_localizations: {
		fr: "Commande sous groupé pour la catégorie utilitaire",
		ja: "ユーティリティコマンドのサブコマンドカテゴリ",
		ru: "Категория подкоманд для утилит",
		"es-ES": "Categoría de subcomando para comandos de utilidad",
		ko: "유틸리티 명령어의 하위 명령어",
		uk: "Категорія підкоманд для утиліт",
		de: "Unterbefehl-Kategorie für Utils-Befehle",
		it: "Categoria di sottocomandi per i comandi utils",
		"pt-BR": "Categoria de subcomandos para comandos utils",
		pl: "Kategoria podkomend dla komend utils"
	},

	options: [
		{
			name: "allwebhooks",

			description: "List all registered webhook on the server",
			description_localizations: {
				fr: "Afficher toute les webhooks enregistrer sur le serveur",
				ja: "サーバーに登録された全Webhookを一覧表示",
				ru: "Показать все вебхуки на сервере",
				"es-ES": "Listar todos los webhooks registrados en el servidor",
				ko: "서버에 등록된 모든 웹후크 목록",
				uk: "Показати всі зареєстровані вебхуки на сервері",
				de: "Alle registrierten Webhooks des Servers auflisten",
				it: "Elenca tutti i webhook registrati nel server",
				"pt-BR": "Liste todos os webhooks registrados no servidor",
				pl: "Wyświetl wszystkie zarejestrowane webhooki serwera"
			},

			aliases: ["webhooks", "webhook"],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "nick-kicker",

			description:
				"Kick a user if their nickname contains a specific word",
			description_localizations: {
				fr: "Expulse un utilisateur si son surnom contient un mot spécifique",
				ja: "ニックネームに特定の単語が含まれているユーザーをキック",
				ru: "Кикнуть пользователя, если его ник содержит определенное слово",
				"es-ES":
					"Expulsar a un usuario si su apodo contiene una palabra específica",
				ko: "별명에 특정 단어가 있는 사용자를 추방해요",
				uk: "Вигнати користувача, якщо його нікнейм містить певне слово",
				de: "Kicke Nutzer, deren Nickname ein bestimmtes Wort enthält",
				it: "Espelli un utente se il suo nickname contiene una parola specifica",
				"pt-BR":
					"Expulse um usuário se o apelido contiver uma palavra específica",
				pl: "Wyrzuć użytkownika, jeśli jego pseudonim zawiera dane słowo"
			},

			aliases: ["nickkick", "nk"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "zip-stickers",

			description: "Create zip files with all guild stickers in!",
			description_localizations: {
				fr: "Créer un fichier zip contenant absolument tout les stickers du serveur",
				ja: "サーバーの全スタンプを含むZIPファイルを作成！",
				ru: "Создать ZIP-файлы со всеми стикерами сервера!",
				"es-ES":
					"Crear archivos zip con todos los stickers del servidor!",
				ko: "서버의 모든 스티커를 담은 zip 파일을 만들어요!",
				uk: "Створити ZIP-файли з усіма стікерами сервера!",
				de: "Erstelle eine ZIP-Datei mit allen Server-Stickern!",
				it: "Crea uno zip con tutti gli sticker del server!",
				"pt-BR": "Crie um zip com todos os stickers do servidor!",
				pl: "Utwórz plik ZIP ze wszystkimi naklejkami serwera!"
			},

			aliases: ["zipstickers", "zip2"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuildExpressions,

			thinking: true
		},
		{
			name: "vkick",

			description: "Disconnect a member from a voice channel",
			description_localizations: {
				fr: "Déconnecter un membre d'un salon vocal",
				ja: "メンバーをボイスチャンネルから切断",
				ru: "Отключить участника от голосового канала",
				"es-ES": "Desconectar a un miembro de un canal de voz",
				ko: "멤버를 음성 채널에서 연결 해제해요",
				uk: "Від'єднати учасника від голосового каналу",
				de: "Ein Mitglied aus einem Sprachkanal trennen",
				it: "Disconnetti un membro da un canale vocale",
				"pt-BR": "Desconecte um membro de um canal de voz",
				pl: "Rozłącz członka z kanału głosowego"
			},

			options: [
				{
					name: "member",

					description: "The member you want to disconnect",
					description_localizations: {
						fr: "Le membre que vous voulez déconnecter",
						ja: "切断したいメンバー",
						ru: "Участник для отключения",
						"es-ES": "El miembro que quieres desconectar",
						ko: "연결을 끊을 멤버",
						uk: "Учасник, якого потрібно від'єднати",
						de: "Das Mitglied, das du trennen willst",
						it: "Il membro da disconnettere",
						"pt-BR": "O membro que você quer desconectar",
						pl: "Członek do rozłączenia"
					},

					type: ApplicationCommandOptionType.User,

					permission: null,

					required: true
				}
			],

			thinking: false,
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "wakeup",

			description:
				"Wake up an user with mass mooving randomly in voice channel",
			description_localizations: {
				fr: "Réveiller un utilisateur avec un déplacement massif aléatoire dans les salons vocaux",
				ja: "ボイスチャンネルでランダムに大量移動してユーザーを起こす",
				ru: "Разбудить пользователя массовым случайным перемещением по голосовому каналу",
				"es-ES":
					"Despertar a un usuario moviéndolo masivamente de forma aleatoria en el canal de voz",
				ko: "음성 채널 사이로 마구 옮겨서 사용자를 깨워요",
				uk: "Розбудити користувача, масово переміщуючи його по голосових каналах",
				de: "Weckt ein Mitglied durch zufälliges Verschieben zwischen Sprachkanälen",
				it: "Sveglia un utente spostandolo a caso tra i canali vocali",
				"pt-BR":
					"Acorda um usuário movendo-o aleatoriamente entre canais de voz",
				pl: "Budzi użytkownika, przenosząc go losowo między kanałami głosowymi"
			},

			aliases: ["wake"],

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "member",

					description: "The member to wake up",
					description_localizations: {
						fr: "Le membre à réveiller",
						ja: "起こすメンバー",
						ru: "Участник, которого нужно разбудить",
						"es-ES": "El miembro a despertar",
						ko: "깨울 멤버",
						uk: "Учасник, якого потрібно розбудити",
						de: "Das Mitglied, das geweckt werden soll",
						it: "Il membro da svegliare",
						"pt-BR": "O membro a acordar",
						pl: "Członek do obudzenia"
					},

					type: ApplicationCommandOptionType.User,

					required: true,

					permission: null
				}
			],

			permission: [
				PermissionFlagsBits.ModerateMembers,
				PermissionFlagsBits.MoveMembers
			]
		},
		{
			name: "derogation",

			description: "Create one fake-admin role managed by iHorizon",
			description_localizations: {
				fr: "Créer un rôle de dérogation fake admin géré par iHorizon",
				ja: "iHorizonが管理する偽管理者ロールを作成",
				ru: "Создать роль фейк-админа, управляемую iHorizon",
				"es-ES":
					"Crear un rol de falso administrador gestionado por iHorizon",
				ko: "iHorizon이 관리하는 가짜 관리자 역할을 만들어요",
				uk: "Створити роль фейк-адміна, керовану iHorizon",
				de: "Erstelle eine von iHorizon verwaltete Fake-Admin-Rolle",
				it: "Crea un finto ruolo admin gestito da iHorizon",
				"pt-BR":
					"Crie um cargo de falso admin gerenciado pelo iHorizon",
				pl: "Utwórz fałszywą rolę admina zarządzaną przez iHorizon"
			},

			aliases: ["dero", "alldero"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "autorenew",
			description: "Renew automaticaly X time a channel",

			description_localizations: {
				fr: "Renouveller automatiquement un salon",
				ja: "チャンネルを自動的にX回更新",
				ru: "Автоматически обновлять канал X раз",
				"es-ES": "Renovar automáticamente un canal X veces",
				ko: "X 시간마다 채널을 자동으로 갱신해요",
				uk: "Автоматично оновлювати канал кожні X часу",
				de: "Einen Kanal automatisch alle X Zeit erneuern",
				it: "Rinnova automaticamente un canale ogni X tempo",
				"pt-BR": "Renove automaticamente um canal a cada X tempo",
				pl: "Automatycznie odnawiaj kanał co X czasu"
			},

			options: [
				{
					name: "channel",

					description: "The channel to renew every x times",
					description_localizations: {
						fr: "Le salon qui ce renouveleras x temps",
						ja: "X回ごとに更新するチャンネル",
						ru: "Канал для обновления каждые X раз",
						"es-ES": "El canal a renovar cada X veces",
						ko: "x 시간마다 새로 만들 채널",
						uk: "Канал, який оновлюватиметься кожні X часу",
						de: "Der Kanal, der alle x Zeit erneuert wird",
						it: "Il canale da rinnovare ogni x tempo",
						"pt-BR": "O canal a renovar a cada x tempo",
						pl: "Kanał do odnawiania co x czasu"
					},

					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					required: true,
					permission: null
				},
				{
					name: "time",

					description: "The x time",
					description_localizations: {
						fr: "Le temps x",
						ja: "X回",
						ru: "X раз",
						"es-ES": "Las X veces",
						ko: "x 시간",
						uk: "Проміжок X",
						de: "Die x-Zeit",
						it: "Il tempo x",
						"pt-BR": "O tempo x",
						pl: "Czas x"
					},

					type: ApplicationCommandOptionType.String,

					required: true,
					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "admin-roles",

			description:
				"Get the list of all guild roles whose have admin permissions",
			description_localizations: {
				fr: "Obtenez la liste de tous les roles de la guilde disposant d'autorisations d'administrateur",
				ja: "管理者権限を持つ全サーバーロールのリストを取得",
				ru: "Получить список всех ролей с правами администратора",
				"es-ES":
					"Obtener la lista de todos los roles del servidor que tienen permisos de administrador",
				ko: "관리자 권한이 있는 모든 서버 역할 목록을 확인해요",
				uk: "Отримати список усіх ролей сервера з правами адміністратора",
				de: "Liste aller Rollen mit Admin-Rechten anzeigen",
				it: "Ottieni l'elenco dei ruoli con permessi admin",
				"pt-BR": "Veja a lista dos cargos com permissões de admin",
				pl: "Pokaż listę ról z uprawnieniami admina"
			},

			aliases: ["allrolesadmin", "adminroles", "adminrole", "allpa"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "cooldown",

			description: "Set a cooldown in the current channel",
			description_localizations: {
				fr: "Mettre un coodlown dans le salon actuel",
				ja: "現在のチャンネルにクールダウンを設定",
				ru: "Установить задержку в текущем канале",
				"es-ES": "Establecer un enfriamiento en el canal actual",
				ko: "현재 채널에 쿨다운을 설정해요",
				uk: "Встановити затримку в поточному каналі",
				de: "Legt eine Abklingzeit im aktuellen Kanal fest",
				it: "Imposta un cooldown nel canale corrente",
				"pt-BR": "Define um cooldown no canal atual",
				pl: "Ustawia czas odnowienia na bieżącym kanale"
			},

			aliases: ["setcooldown", "coldown", "slow", "slowmode"],

			options: [
				{
					name: "duration",
					name_localizations: {
						fr: "durée",
						ja: "duration",
						ru: "duration",
						"es-ES": "duration",
						ko: "duration",
						uk: "duration",
						de: "duration",
						it: "duration",
						"pt-BR": "duration",
						pl: "duration"
					},

					description: "The duration of the slowmode",
					description_localizations: {
						fr: "La durée du slow mode",
						ja: "低速モードの時間",
						ru: "Длительность замедленного режима",
						"es-ES": "La duración del modo lento",
						ko: "슬로우 모드 기간",
						uk: "Тривалість повільного режиму",
						de: "Die Dauer des Slowmodes",
						it: "La durata della modalità lenta",
						"pt-BR": "A duração do modo lento",
						pl: "Czas trwania trybu powolnego"
					},

					choices: [
						{
							name: "None",
							value: "0",
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
							}
						},
						{
							name: "5 seconds",
							value: "5s",
							name_localizations: {
								fr: "5 secondes",
								ja: "5_seconds",
								ru: "5_seconds",
								"es-ES": "5_seconds",
								ko: "5초",
								uk: "5 секунд",
								de: "5 Sekunden",
								it: "5 secondi",
								"pt-BR": "5 segundos",
								pl: "5 sekund"
							}
						},
						{
							name: "10 seconds",
							value: "10s",
							name_localizations: {
								fr: "10 secondes",
								ja: "10_seconds",
								ru: "10_seconds",
								"es-ES": "10_seconds",
								ko: "10초",
								uk: "10 секунд",
								de: "10 Sekunden",
								it: "10 secondi",
								"pt-BR": "10 segundos",
								pl: "10 sekund"
							}
						},
						{
							name: "15 seconds",
							value: "15s",
							name_localizations: {
								fr: "15 secondes",
								ja: "15_seconds",
								ru: "15_seconds",
								"es-ES": "15_seconds",
								ko: "15초",
								uk: "15 секунд",
								de: "15 Sekunden",
								it: "15 secondi",
								"pt-BR": "15 segundos",
								pl: "15 sekund"
							}
						},
						{
							name: "30 seconds",
							value: "30s",
							name_localizations: {
								fr: "30 secondes",
								ja: "30_seconds",
								ru: "30_seconds",
								"es-ES": "30_seconds",
								ko: "30초",
								uk: "30 секунд",
								de: "30 Sekunden",
								it: "30 secondi",
								"pt-BR": "30 segundos",
								pl: "30 sekund"
							}
						},
						{
							name: "1 minute",
							value: "1m",
							name_localizations: {
								fr: "1 minute",
								ja: "1_minute",
								ru: "1_minute",
								"es-ES": "1_minute",
								ko: "1분",
								uk: "1 хвилина",
								de: "1 Minute",
								it: "1 minuto",
								"pt-BR": "1 minuto",
								pl: "1 minuta"
							}
						},
						{
							name: "2 minutes",
							value: "2m",
							name_localizations: {
								fr: "2 minutes",
								ja: "2_minutes",
								ru: "2_minutes",
								"es-ES": "2_minutes",
								ko: "2분",
								uk: "2 хвилини",
								de: "2 Minuten",
								it: "2 minuti",
								"pt-BR": "2 minutos",
								pl: "2 minuty"
							}
						},
						{
							name: "5 minutes",
							value: "5m",
							name_localizations: {
								fr: "5 minutes",
								ja: "5_minutes",
								ru: "5_minutes",
								"es-ES": "5_minutes",
								ko: "5분",
								uk: "5 хвилин",
								de: "5 Minuten",
								it: "5 minuti",
								"pt-BR": "5 minutos",
								pl: "5 minut"
							}
						},
						{
							name: "10 minutes",
							value: "10m",
							name_localizations: {
								fr: "10 minutes",
								ja: "10_minutes",
								ru: "10_minutes",
								"es-ES": "10_minutes",
								ko: "10분",
								uk: "10 хвилин",
								de: "10 Minuten",
								it: "10 minuti",
								"pt-BR": "10 minutos",
								pl: "10 minut"
							}
						},
						{
							name: "15 minutes",
							value: "15m",
							name_localizations: {
								fr: "15 minutes",
								ja: "15_minutes",
								ru: "15_minutes",
								"es-ES": "15_minutes",
								ko: "15분",
								uk: "15 хвилин",
								de: "15 Minuten",
								it: "15 minuti",
								"pt-BR": "15 minutos",
								pl: "15 minut"
							}
						},
						{
							name: "30 minutes",
							value: "30m",
							name_localizations: {
								fr: "30 minutes",
								ja: "30_minutes",
								ru: "30_minutes",
								"es-ES": "30_minutes",
								ko: "30분",
								uk: "30 хвилин",
								de: "30 Minuten",
								it: "30 minuti",
								"pt-BR": "30 minutos",
								pl: "30 minut"
							}
						},
						{
							name: "1 hour",
							value: "1h",
							name_localizations: {
								fr: "1 heure",
								ja: "1_hour",
								ru: "1_hour",
								"es-ES": "1_hour",
								ko: "1시간",
								uk: "1 година",
								de: "1 Stunde",
								it: "1 ora",
								"pt-BR": "1 hora",
								pl: "1 godzina"
							}
						},
						{
							name: "2 hours",
							value: "2h",
							name_localizations: {
								fr: "2 heures",
								ja: "2_hours",
								ru: "2_hours",
								"es-ES": "2_hours",
								ko: "2시간",
								uk: "2 години",
								de: "2 Stunden",
								it: "2 ore",
								"pt-BR": "2 horas",
								pl: "2 godziny"
							}
						},
						{
							name: "6 hours",
							value: "6h",
							name_localizations: {
								fr: "6 heures",
								ja: "6_hours",
								ru: "6_hours",
								"es-ES": "6_hours",
								ko: "6시간",
								uk: "6 годин",
								de: "6 Stunden",
								it: "6 ore",
								"pt-BR": "6 horas",
								pl: "6 godzin"
							}
						}
					],

					required: true,
					type: ApplicationCommandOptionType.String,
					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "rolelimit",

			description: "Limit the number of member(s) in the same role",
			description_localizations: {
				fr: "Limiter le nombre de membres qui peuvent ce partager un rôle.",
				ja: "同じロールのメンバー数を制限",
				ru: "Ограничить количество участников с одной ролью",
				"es-ES": "Limitar el número de miembros en el mismo rol",
				ko: "같은 역할을 가진 멤버 수를 제한해요",
				uk: "Обмежити кількість учасників з однією роллю",
				de: "Begrenze die Mitgliederzahl in derselben Rolle",
				it: "Limita il numero di membri con lo stesso ruolo",
				"pt-BR": "Limite o número de membros no mesmo cargo",
				pl: "Ogranicz liczbę członków w tej samej roli"
			},

			aliases: ["limitrole", "limitoles", "roleslimit"],

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "role",

					description: "The role you want to manage",
					description_localizations: {
						fr: "Le rôle que tu shouaite gérer.",
						ja: "管理したいロール",
						ru: "Роль, которой вы хотите управлять",
						"es-ES": "El rol que quieres gestionar",
						ko: "관리할 역할",
						uk: "Роль, якою ви хочете керувати",
						de: "Die Rolle, die du verwalten willst",
						it: "Il ruolo da gestire",
						"pt-BR": "O cargo que você quer gerenciar",
						pl: "Rola do zarządzania"
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: true
				},
				{
					name: "members-limit",

					description: "The maximum member you want on the sane role",
					description_localizations: {
						fr: "Le nombre maximum de membre qui auront le rôle en même temps.",
						ja: "同じロールに許可する最大メンバー数",
						ru: "Максимум участников с одинаковой ролью",
						"es-ES":
							"El máximo de miembros que deseas en el mismo rol",
						ko: "한 역할에 허용할 최대 멤버 수",
						uk: "Максимальна кількість учасників з цією роллю",
						de: "Maximale Mitgliederzahl für dieselbe Rolle",
						it: "Numero massimo di membri con lo stesso ruolo",
						"pt-BR": "Número máximo de membros com o mesmo cargo",
						pl: "Maksymalna liczba członków z tą samą rolą"
					},

					permission: null,
					type: ApplicationCommandOptionType.Number
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "where",
			aliases: ["whereis"],

			description: "Sending the channel where the members is",
			description_localizations: {
				fr: "Envoie le salon vocal où est le membre.",
				ja: "メンバーがいるチャンネルを送信",
				ru: "Отправить канал, где находится участник",
				"es-ES": "Enviar el canal donde está el miembro",
				ko: "멤버가 있는 채널을 보내요",
				uk: "Надіслати канал, у якому перебуває учасник",
				de: "Sendet den Kanal, in dem sich die Mitglieder befinden",
				it: "Invia il canale in cui si trovano i membri",
				"pt-BR": "Envia o canal em que os membros estão",
				pl: "Wysyła kanał, w którym przebywają członkowie"
			},

			thinking: false,
			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "member",

					description: "The member you want to check",
					description_localizations: {
						fr: "le membre que vous souhaitez vérifier",
						ja: "確認したいメンバー",
						ru: "Участник для проверки",
						"es-ES": "El miembro que quieres comprobar",
						ko: "확인할 멤버",
						uk: "Учасник, якого потрібно перевірити",
						de: "Das Mitglied, das du prüfen willst",
						it: "Il membro da controllare",
						"pt-BR": "O membro que você quer verificar",
						pl: "Członek do sprawdzenia"
					},

					permission: null,

					type: ApplicationCommandOptionType.User,
					required: true
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "serverpic",

			description: "Sending the guild image",
			description_localizations: {
				fr: "Envoie le logo du serveur",
				ja: "サーバー画像を送信",
				ru: "Отправить изображение сервера",
				"es-ES": "Enviar la imagen del servidor",
				ko: "서버 이미지를 보내요",
				uk: "Надіслати зображення сервера",
				de: "Sendet das Serverbild",
				it: "Invia l'immagine del server",
				"pt-BR": "Envia a imagem do servidor",
				pl: "Wysyła obraz serwera"
			},

			thinking: false,
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unzip-emojis",

			description: "Recreate all emojis from a zip file",
			description_localizations: {
				fr: "Recreer tout les emojis depuis un fichier zip",
				ja: "ZIPファイルから全絵文字を再作成",
				ru: "Воссоздать все эмодзи из ZIP-файла",
				"es-ES": "Recrear todos los emojis desde un archivo zip",
				ko: "zip 파일로 모든 이모지를 다시 만들어요",
				uk: "Відтворити всі емодзі із ZIP-файлу",
				de: "Alle Emojis aus einer ZIP-Datei neu erstellen",
				it: "Ricrea tutte le emoji da un file zip",
				"pt-BR": "Recrie todos os emojis a partir de um arquivo zip",
				pl: "Odtwórz wszystkie emotki z pliku ZIP"
			},

			aliases: ["unzipemojis", "unzip1"],

			options: [
				{
					name: "zip_file",

					description: "The zip file to recreate emojis",
					description_localizations: {
						fr: "Le fichier zip pour recréer les emojis",
						ja: "絵文字を再作成するZIPファイル",
						ru: "ZIP-файл для воссоздания эмодзи",
						"es-ES": "El archivo zip para recrear emojis",
						ko: "이모지를 다시 만들 zip 파일",
						uk: "ZIP-файл для відтворення емодзі",
						de: "Die ZIP-Datei zum Wiederherstellen der Emojis",
						it: "Il file ZIP per ricreare le emoji",
						"pt-BR": "O arquivo ZIP para recriar os emojis",
						pl: "Plik ZIP do odtworzenia emoji"
					},

					type: ApplicationCommandOptionType.Attachment,

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			thinking: true,

			permission: PermissionFlagsBits.ManageGuildExpressions
		},
		{
			name: "sync",

			description: "Sync all channels to the parent category",

			description_localizations: {
				fr: "Synchroniser tous les channels avec la catégorie parent",
				ja: "全てのチャンネルを親カテゴリに同期",
				ru: "Синхронизировать все каналы с родительской категорией",
				"es-ES":
					"Sincronizar todos los canales con la categoría principal",
				ko: "모든 채널을 상위 카테고리와 동기화해요",
				uk: "Синхронізувати всі канали з батьківською категорією",
				de: "Synchronisiert alle Kanäle mit der übergeordneten Kategorie",
				it: "Sincronizza tutti i canali con la categoria padre",
				"pt-BR": "Sincroniza todos os canais com a categoria pai",
				pl: "Synchronizuje wszystkie kanały z kategorią nadrzędną"
			},

			options: [
				{
					name: "category",

					description: "The category to sync channels to",
					description_localizations: {
						fr: "La catégorie pour synchroniser les channels",
						ja: "チャンネルを同期するカテゴリ",
						ru: "Категория для синхронизации каналов",
						"es-ES":
							"La categoría a la que sincronizar los canales",
						ko: "채널을 동기화할 카테고리",
						uk: "Категорія для синхронізації каналів",
						de: "Kategorie, mit der Kanäle synchronisiert werden",
						it: "Categoria con cui sincronizzare i canali",
						"pt-BR": "Categoria com a qual sincronizar os canais",
						pl: "Kategoria, z którą zsynchronizować kanały"
					},

					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildCategory],

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "addrolereact",

			description:
				"Add a role to all users who reacted to a specific message",
			description_localizations: {
				fr: "Ajouter un rôle à tous les utilisateurs qui ont réagi à un message spécifique",
				ja: "特定のメッセージにリアクションした全ユーザーにロールを追加",
				ru: "Добавить роль всем, кто отреагировал на сообщение",
				"es-ES":
					"Añadir un rol a todos los usuarios que reaccionaron a un mensaje específico",
				ko: "특정 메시지에 반응한 모든 사용자에게 역할을 추가해요",
				uk: "Додати роль усім, хто відреагував на певне повідомлення",
				de: "Gib allen, die auf eine bestimmte Nachricht reagiert haben, eine Rolle",
				it: "Aggiungi un ruolo a tutti gli utenti che hanno reagito a un messaggio",
				"pt-BR":
					"Adicione um cargo a todos que reagiram a uma mensagem específica",
				pl: "Dodaj rolę wszystkim, którzy zareagowali na daną wiadomość"
			},

			options: [
				{
					name: "message_id",

					description:
						"The ID of the message to check reactions from",
					description_localizations: {
						fr: "L'ID du message dont on veut vérifier les réactions",
						ja: "リアクションを確認するメッセージのID",
						ru: "ID сообщения для проверки реакций",
						"es-ES":
							"El ID del mensaje para comprobar las reacciones",
						ko: "반응을 확인할 메시지 ID",
						uk: "ID повідомлення, реакції на яке перевіряти",
						de: "ID der Nachricht, deren Reaktionen geprüft werden",
						it: "ID del messaggio di cui controllare le reazioni",
						"pt-BR":
							"ID da mensagem cujas reações serão verificadas",
						pl: "ID wiadomości, której reakcje sprawdzić"
					},

					type: ApplicationCommandOptionType.String,

					required: true,
					permission: null
				},
				{
					name: "role",

					description: "The role to add to users",
					description_localizations: {
						fr: "Le rôle à ajouter aux utilisateurs",
						ja: "ユーザーに追加するロール",
						ru: "Роль для добавления пользователям",
						"es-ES": "El rol a añadir a los usuarios",
						ko: "사용자에게 추가할 역할",
						uk: "Роль, яку потрібно додати користувачам",
						de: "Die Rolle, die Mitgliedern hinzugefügt wird",
						it: "Il ruolo da aggiungere agli utenti",
						"pt-BR": "O cargo a adicionar aos usuários",
						pl: "Rola do dodania użytkownikom"
					},

					type: ApplicationCommandOptionType.Role,

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageRoles
		},
		{
			name: "inviteinfo",

			description: "Get informations about the discord invite link",
			description_localizations: {
				fr: "Obtenir des informations vis-à-vis de l'invitations discord",
				ja: "Discord招待リンクの情報を取得",
				ru: "Получить информацию о пригласительной ссылке Discord",
				"es-ES":
					"Obtener información sobre el enlace de invitación de Discord",
				ko: "Discord 초대 링크 정보를 확인해요",
				uk: "Отримати інформацію про запрошення Discord",
				de: "Infos zum Discord-Einladungslink anzeigen",
				it: "Ottieni informazioni sul link d'invito Discord",
				"pt-BR": "Veja informações sobre o link de convite do Discord",
				pl: "Pokaż informacje o linku zaproszenia Discord"
			},

			aliases: [],

			options: [
				{
					name: "discord_invite",

					description: "the discord invite / code",
					description_localizations: {
						fr: "le lien d'invitation discord ou le code",
						ja: "Discord招待 / コード",
						ru: "приглашение / код Discord",
						"es-ES": "la invitación / código de Discord",
						ko: "Discord 초대 링크 / 코드",
						uk: "запрошення / код Discord",
						de: "Die Discord-Einladung / der Code",
						it: "L'invito / il codice Discord",
						"pt-BR": "O convite / código do Discord",
						pl: "Zaproszenie / kod Discord"
					},

					type: ApplicationCommandOptionType.String,

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			thinking: true,

			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "role-members",

			description: "See all server member(s) who have the same roles",
			description_localizations: {
				fr: "Afficher tout les membres d'un serveur qui possèdent le même rôle",
				ja: "同じロールを持つ全サーバーメンバーを表示",
				ru: "Показать участников с одинаковыми ролями",
				"es-ES":
					"Ver todos los miembros del servidor que tienen los mismos roles",
				ko: "같은 역할을 가진 모든 서버 멤버를 확인해요",
				uk: "Показати всіх учасників сервера з однаковими ролями",
				de: "Zeigt alle Mitglieder mit denselben Rollen",
				it: "Mostra tutti i membri con gli stessi ruoli",
				"pt-BR": "Mostra todos os membros com os mesmos cargos",
				pl: "Pokazuje wszystkich członków z tymi samymi rolami"
			},

			aliases: ["rolemembers", "rolemember"],

			options: [
				{
					name: "role",

					description: "The role you want to check",
					description_localizations: {
						fr: "Le rôle que vous voulez vérifier",
						ja: "確認したいロール",
						ru: "Роль для проверки",
						"es-ES": "El rol que quieres comprobar",
						ko: "확인할 역할",
						uk: "Роль, яку потрібно перевірити",
						de: "Die Rolle, die du prüfen willst",
						it: "Il ruolo da controllare",
						"pt-BR": "O cargo que você quer verificar",
						pl: "Rola do sprawdzenia"
					},

					type: ApplicationCommandOptionType.Role,

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageRoles
		},
		{
			name: "bringall",

			description:
				"Randomly distribute members from a voice channel to all voice channels in a category",
			description_localizations: {
				fr: "Distribue aléatoirement les membres d'un salon vocal dans tous les salons d'une catégorie",
				ja: "ボイスチャンネルのメンバーをカテゴリ内の全ボイスチャンネルにランダムに分散",
				ru: "Случайно распределить участников из голосового канала по всем каналам в категории",
				"es-ES":
					"Distribuir aleatoriamente miembros de un canal de voz a todos los canales de voz en una categoría",
				ko: "음성 채널의 멤버를 카테고리 내 모든 음성 채널에 무작위로 나눠요",
				uk: "Випадково розподілити учасників голосового каналу по всіх голосових каналах категорії",
				de: "Verteile Mitglieder eines Sprachkanals zufällig auf alle Sprachkanäle einer Kategorie",
				it: "Distribuisci a caso i membri di un canale vocale tra tutti i canali vocali di una categoria",
				"pt-BR":
					"Distribua aleatoriamente os membros de um canal de voz entre os canais de voz de uma categoria",
				pl: "Losowo rozdziel członków kanału głosowego na wszystkie kanały głosowe kategorii"
			},

			thinking: false,
			type: ApplicationCommandOptionType.Subcommand,
			permission: [
				PermissionFlagsBits.MoveMembers,
				PermissionFlagsBits.ModerateMembers
			],

			options: [
				{
					name: "from",

					type: ApplicationCommandOptionType.Channel,

					description:
						"The source voice channel to move members from",
					description_localizations: {
						fr: "Le salon vocal source depuis lequel déplacer les membres",
						ja: "メンバーを移動する元のボイスチャンネル",
						ru: "Исходный голосовой канал для перемещения участников",
						"es-ES":
							"El canal de voz de origen para mover miembros",
						ko: "멤버를 옮겨 올 원래 음성 채널",
						uk: "Голосовий канал, з якого переміщувати учасників",
						de: "Quell-Sprachkanal, aus dem Mitglieder verschoben werden",
						it: "Canale vocale di origine da cui spostare i membri",
						"pt-BR":
							"Canal de voz de origem de onde mover os membros",
						pl: "Źródłowy kanał głosowy, z którego przenieść członków"
					},

					required: true,
					channel_types: [
						ChannelType.GuildVoice,
						ChannelType.GuildStageVoice
					],
					permission: null
				},
				{
					name: "category",

					type: ApplicationCommandOptionType.Channel,

					description:
						"The category containing voice channels to distribute members to",
					description_localizations: {
						fr: "La catégorie contenant les salons vocaux où distribuer les membres",
						ja: "メンバーを分散するボイスチャンネルを含むカテゴリ",
						ru: "Категория с голосовыми каналами для распределения участников",
						"es-ES":
							"La categoría que contiene los canales de voz a los que distribuir miembros",
						ko: "멤버를 나눠 보낼 음성 채널이 있는 카테고리",
						uk: "Категорія з голосовими каналами для розподілу учасників",
						de: "Kategorie mit Sprachkanälen, auf die Mitglieder verteilt werden",
						it: "Categoria con i canali vocali su cui distribuire i membri",
						"pt-BR":
							"Categoria com canais de voz para distribuir os membros",
						pl: "Kategoria z kanałami głosowymi, na które trafią członkowie"
					},

					required: true,
					channel_types: [ChannelType.GuildCategory],
					permission: null
				}
			]
		},
		{
			name: "talk",
			prefixName: "talk",

			description: "Enable talk mode in your current voice channel",
			description_localizations: {
				fr: "Activer le mode talk dans votre salon vocal actuel",
				ja: "現在のボイスチャンネルでトークモードを有効化",
				ru: "Включить режим разговора в текущем голосовом канале",
				"es-ES":
					"Habilitar el modo de conversación en tu canal de voz actual",
				ko: "현재 음성 채널에서 발언 모드를 켜요",
				uk: "Увімкнути режим розмови в поточному голосовому каналі",
				de: "Sprechmodus in deinem aktuellen Sprachkanal aktivieren",
				it: "Attiva la modalità talk nel tuo canale vocale attuale",
				"pt-BR": "Ative o modo de fala no seu canal de voz atual",
				pl: "Włącz tryb rozmowy na bieżącym kanale głosowym"
			},

			aliases: ["mutetalk"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: [
				PermissionFlagsBits.MuteMembers,
				PermissionFlagsBits.MoveMembers
			]
		},
		{
			name: "untalk",
			prefixName: "untalk",

			description: "Disable talk mode and unmute everyone",
			description_localizations: {
				fr: "Désactiver le mode talk et démute tout le monde",
				ja: "トークモードを無効化して全員のミュートを解除",
				ru: "Отключить режим разговора и размутить всех",
				"es-ES":
					"Deshabilitar el modo de conversación y desilenciar a todos",
				ko: "발언 모드를 끄고 모든 멤버의 음소거를 해제해요",
				uk: "Вимкнути режим розмови й увімкнути мікрофон усім",
				de: "Sprechmodus deaktivieren und alle entmuten",
				it: "Disattiva la modalità talk e riattiva l'audio a tutti",
				"pt-BR": "Desative o modo de fala e desmute todos",
				pl: "Wyłącz tryb rozmowy i wyłącz wyciszenie wszystkich"
			},

			aliases: ["unmutetalk"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: [
				PermissionFlagsBits.MuteMembers,
				PermissionFlagsBits.MoveMembers
			]
		},
		{
			name: "freeze",
			prefixName: "freeze",

			description: "Freeze access to your current voice channel",
			description_localizations: {
				fr: "Geler l'accès à votre salon vocal actuel",
				ja: "現在のボイスチャンネルへのアクセスを凍結",
				ru: "Заморозить доступ к текущему голосовому каналу",
				"es-ES": "Congelar el acceso a tu canal de voz actual",
				ko: "현재 음성 채널의 입장을 동결해요",
				uk: "Заморозити доступ до поточного голосового каналу",
				de: "Zugang zu deinem aktuellen Sprachkanal einfrieren",
				it: "Congela l'accesso al tuo canale vocale attuale",
				"pt-BR": "Congele o acesso ao seu canal de voz atual",
				pl: "Zamroź dostęp do bieżącego kanału głosowego"
			},

			aliases: ["voicefreeze", "vcfreeze", "pv"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.MoveMembers
		},
		{
			name: "wlvc",
			prefixName: "wlvc",

			description: "Allow a member to join the frozen voice channel",
			description_localizations: {
				fr: "Autoriser un membre à rejoindre le salon vocal gelé",
				ja: "凍結されたボイスチャンネルへの参加を許可",
				ru: "Разрешить участнику войти в замороженный голосовой канал",
				"es-ES":
					"Permitir a un miembro unirse al canal de voz congelado",
				ko: "동결된 음성 채널에 멤버가 참여할 수 있게 허용해요",
				uk: "Дозволити учаснику увійти до замороженого голосового каналу",
				de: "Erlaube einem Mitglied, dem eingefrorenen Sprachkanal beizutreten",
				it: "Permetti a un membro di entrare nel canale vocale congelato",
				"pt-BR":
					"Permita que um membro entre no canal de voz congelado",
				pl: "Pozwól członkowi dołączyć do zamrożonego kanału głosowego"
			},

			options: [
				{
					name: "member",
					description: "The member you want to allow",
					description_localizations: {
						fr: "Le membre que vous voulez autoriser",
						ja: "許可したいメンバー",
						ru: "Участник, которого вы хотите разрешить",
						"es-ES": "El miembro que quieres permitir",
						ko: "허용할 멤버",
						uk: "Учасник, якому ви хочете дозволити вхід",
						de: "Das Mitglied, das du erlauben willst",
						it: "Il membro da autorizzare",
						"pt-BR": "O membro que você quer permitir",
						pl: "Członek, któremu zezwolić"
					},
					type: ApplicationCommandOptionType.User,
					required: true,
					permission: null
				}
			],

			aliases: ["allowvc"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.MoveMembers
		},
		{
			name: "unwlvc",
			prefixName: "unwlvc",

			description:
				"Remove a member from the frozen voice channel whitelist",
			description_localizations: {
				fr: "Retirer un membre de la whitelist du salon vocal gelé",
				ja: "凍結ボイスチャンネルのホワイトリストからメンバーを削除",
				ru: "Удалить участника из белого списка замороженного голосового канала",
				"es-ES":
					"Eliminar a un miembro de la lista blanca del canal de voz congelado",
				ko: "동결된 음성 채널의 허용 목록에서 멤버를 제거해요",
				uk: "Видалити учасника з білого списку замороженого голосового каналу",
				de: "Ein Mitglied von der Whitelist des eingefrorenen Sprachkanals entfernen",
				it: "Rimuovi un membro dalla whitelist del canale vocale congelato",
				"pt-BR":
					"Remova um membro da whitelist do canal de voz congelado",
				pl: "Usuń członka z białej listy zamrożonego kanału głosowego"
			},

			options: [
				{
					name: "member",
					description: "The member you want to remove",
					description_localizations: {
						fr: "Le membre que vous voulez retirer",
						ja: "削除したいメンバー",
						ru: "Участник для удаления",
						"es-ES": "El miembro que quieres eliminar",
						ko: "제거할 멤버",
						uk: "Учасник, якого потрібно видалити",
						de: "Das Mitglied, das du entfernen willst",
						it: "Il membro da rimuovere",
						"pt-BR": "O membro que você quer remover",
						pl: "Członek do usunięcia"
					},
					type: ApplicationCommandOptionType.User,
					required: true,
					permission: null
				}
			],

			aliases: ["removevcwl"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.MoveMembers
		},
		{
			name: "unfreeze",
			prefixName: "unfreeze",

			description: "Remove the active voice freeze",
			description_localizations: {
				fr: "Retirer le gel vocal actif",
				ja: "アクティブなボイス凍結を解除",
				ru: "Снять активную заморозку голосового канала",
				"es-ES": "Eliminar la congelación de voz activa",
				ko: "활성화된 음성 채널 동결을 해제해요",
				uk: "Зняти активне заморожування голосового каналу",
				de: "Aktiven Sprachkanal-Freeze aufheben",
				it: "Rimuovi il congelamento vocale attivo",
				"pt-BR": "Remova o congelamento de voz ativo",
				pl: "Usuń aktywne zamrożenie kanału głosowego"
			},

			aliases: ["defreeze"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.MoveMembers
		},
		{
			name: "move",

			description: "Move an user from voice-channel.",
			description_localizations: {
				fr: "Déplacer un membre d'un salon vocal",
				ja: "ユーザーをボイスチャンネルから移動。",
				ru: "Переместить пользователя из голосового канала.",
				"es-ES": "Mover a un usuario de un canal de voz.",
				ko: "사용자를 다른 음성 채널로 옮겨요.",
				uk: "Перемістити користувача з голосового каналу.",
				de: "Einen Nutzer aus dem Sprachkanal verschieben.",
				it: "Sposta un utente da un canale vocale.",
				"pt-BR": "Mova um usuário de um canal de voz.",
				pl: "Przenieś użytkownika z kanału głosowego."
			},

			aliases: ["déplacer", "switch"],

			options: [
				{
					name: "member",

					description: "The member you want to move",
					description_localizations: {
						fr: "Le membre que vous voulez déplacer",
						ja: "移動したいメンバー",
						ru: "Участник для перемещения",
						"es-ES": "El miembro que quieres mover",
						ko: "이동할 멤버",
						uk: "Учасник, якого потрібно перемістити",
						de: "Das Mitglied, das du verschieben willst",
						it: "Il membro da spostare",
						"pt-BR": "O membro que você quer mover",
						pl: "Członek do przeniesienia"
					},

					permission: null,
					type: ApplicationCommandOptionType.User,
					required: true
				},
				{
					name: "channel",

					description: "The channel you want",
					description_localizations: {
						fr: "Le salon vocal que tu veux.",
						ja: "希望するチャンネル",
						ru: "Желаемый канал",
						"es-ES": "El canal que deseas",
						ko: "원하는 채널",
						uk: "Бажаний канал",
						de: "Der gewünschte Kanal",
						it: "Il canale che vuoi",
						"pt-BR": "O canal que você quer",
						pl: "Wybrany kanał"
					},

					permission: null,
					type: ApplicationCommandOptionType.Channel,
					channel_types: [
						ChannelType.GuildVoice,
						ChannelType.GuildStageVoice
					],
					required: true
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: [PermissionFlagsBits.MoveMembers]
		}
	],

	category: "utils",
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null
};

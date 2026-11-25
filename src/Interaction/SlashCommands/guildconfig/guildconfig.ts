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
	name: "guildconfig",

	description: "Subcommand for guildconfig category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de configuration du serveur",
		ja: "サーバー設定カテゴリのサブコマンド！",
		ru: "Подкоманда для категории настройки сервера!",
		"es-ES": "Subcomando para la categoría de configuración del servidor!",
		ko: "서버 설정 하위 명령어!",
		uk: "Підкоманда для категорії налаштувань сервера!",
		de: "Unterbefehle der Serverkonfigurations-Kategorie!",
		it: "Sottocomandi della categoria configurazione server!",
		"pt-BR": "Subcomandos da categoria configuração do servidor!",
		pl: "Podkomendy kategorii konfiguracji serwera!"
	},

	options: [
		{
			name: "setup",

			description: "Setup the logs channel about the bot!",
			description_localizations: {
				fr: "Configurer le canal de journaux sur le bot",
				ja: "ボットのログチャンネルを設定！",
				ru: "Настроить канал логов бота!",
				"es-ES": "Configurar el canal de registros sobre el bot!",
				ko: "봇 로그 채널을 설정해요!",
				uk: "Налаштувати канал логів бота!",
				de: "Richtet den Log-Kanal für den Bot ein!",
				it: "Configura il canale dei log del bot!",
				"pt-BR": "Configura o canal de logs do bot!",
				pl: "Konfiguruje kanał logów bota!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "block",

			description: "Block/Protect someting/behaviours into this guild!",
			description_localizations: {
				fr: "Bloquer/Protéger certains comportements/comportements dans cette guilde",
				ja: "このサーバー内の何か/行動をブロック/保護！",
				ru: "Заблокировать/защитить что-либо на этом сервере!",
				"es-ES":
					"Bloquear/Proteger algo/comportamientos en este servidor!",
				ko: "이 서버에서 특정 항목/행동을 차단하거나 보호해요!",
				uk: "Заблокувати/захистити щось на цьому сервері!",
				de: "Blockiere/schütze Dinge und Verhalten auf diesem Server!",
				it: "Blocca/proteggi cose e comportamenti in questo server!",
				"pt-BR":
					"Bloqueie/proteja coisas e comportamentos neste servidor!",
				pl: "Blokuj/chroń rzeczy i zachowania na tym serwerze!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,
			options: [
				{
					name: "bot",

					description:
						"Block the ability to add new bots into this server",
					description_localizations: {
						fr: "Bloquer la possibilité d'ajouter de nouveaux robots sur ce serveur",
						ja: "このサーバーに新しいボットを追加する機能をブロック",
						ru: "Заблокировать возможность добавления новых ботов на сервер",
						"es-ES":
							"Bloquear la capacidad de añadir nuevos bots a este servidor",
						ko: "이 서버에 새 봇을 추가하지 못하게 막아요",
						uk: "Заблокувати можливість додавати нових ботів на сервер",
						de: "Verhindere das Hinzufügen neuer Bots zu diesem Server",
						it: "Blocca la possibilità di aggiungere nuovi bot a questo server",
						"pt-BR":
							"Bloqueie a adição de novos bots a este servidor",
						pl: "Zablokuj dodawanie nowych botów na tym serwerze"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "action",
							type: ApplicationCommandOptionType.String,

							description: "What you want to do?",
							description_localizations: {
								fr: "Que veux-tu faire?",
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
					name: "too-new-account",
					name_localizations: {
						fr: "compte-trop-recent",
						ja: "too-new-account",
						ru: "too-new-account",
						"es-ES": "too-new-account",
						ko: "too-new-account",
						uk: "too-new-account",
						de: "too-new-account",
						it: "too-new-account",
						"pt-BR": "too-new-account",
						pl: "too-new-account"
					},

					description:
						"Block accounts that are too new from joining your server",
					description_localizations: {
						fr: "Bloquer les compte trop récent de rejoindre votre serveur",
						ja: "新しすぎるアカウントのサーバー参加をブロック",
						ru: "Блокировать слишком новые аккаунты от входа на сервер",
						"es-ES":
							"Bloquear cuentas demasiado nuevas para unirse a tu servidor",
						ko: "너무 최근에 만든 계정이 서버에 참여하지 못하게 막아요",
						uk: "Не пускати на сервер надто нові акаунти",
						de: "Verhindere, dass zu neue Accounts deinem Server beitreten",
						it: "Impedisci agli account troppo recenti di entrare nel tuo server",
						"pt-BR":
							"Impeça que contas muito novas entrem no seu servidor",
						pl: "Blokuj za nowe konta przed dołączeniem do serwera"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "action",
							type: ApplicationCommandOptionType.String,

							description: "What you want to do?",
							description_localizations: {
								fr: "Que veux-tu faire?",
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
						},
						{
							name: "minimum-date",
							type: ApplicationCommandOptionType.String,

							description: "Minimum seniority time",
							description_localizations: {
								fr: "Temps minimum d'ancienneté",
								ja: "最低アカウント経過時間",
								ru: "Минимальное время существования аккаунта",
								"es-ES": "Tiempo mínimo de antigüedad",
								ko: "최소 계정 나이",
								uk: "Мінімальний вік акаунта",
								de: "Mindestdauer der Mitgliedschaft",
								it: "Anzianità minima",
								"pt-BR": "Tempo mínimo de antiguidade",
								pl: "Minimalny staż"
							},

							required: false,

							permission: null
						},
						{
							name: "maximum-join",
							type: ApplicationCommandOptionType.Number,

							description: "Maximum join before ban",
							description_localizations: {
								fr: "Montant de join maximum possible de l'utilisateur avant sont bannisement",
								ja: "バン前の最大参加回数",
								ru: "Максимум входов до бана",
								"es-ES": "Máximo de uniones antes del ban",
								ko: "차단 전 최대 입장 수",
								uk: "Максимум входів до бану",
								de: "Maximale Beitritte vor dem Bann",
								it: "Ingressi massimi prima del ban",
								"pt-BR":
									"Máximo de entradas antes do banimento",
								pl: "Maks. liczba dołączeń przed banem"
							},

							required: false,

							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				}
			],
			permission: null
		},
		{
			name: "set",

			description: "Set someting/behaviours into this guild!",
			description_localizations: {
				fr: "Définir quelque chose/comportements dans ce serveur",
				ja: "このサーバー内の何か/行動を設定！",
				ru: "Установить что-либо на этом сервере!",
				"es-ES": "Establecer algo/comportamientos en este servidor!",
				ko: "이 서버의 설정과 동작을 변경해요!",
				uk: "Налаштувати щось на цьому сервері!",
				de: "Legt Einstellungen/Verhalten für diesen Server fest!",
				it: "Imposta qualcosa/comportamenti in questo server!",
				"pt-BR": "Define configurações/comportamentos deste servidor!",
				pl: "Ustawia opcje/zachowania na tym serwerze!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,
			options: [
				{
					name: "welcomer",

					description:
						"Configure the welcomer module (messages, channels, image)!",
					description_localizations: {
						fr: "Configurer le module de bienvenue (messages, salons, image)",
						ja: "ウェルカムモジュール（メッセージ・チャンネル・画像）を設定！",
						ru: "Настроить модуль приветствия (сообщения, каналы, изображение)!",
						"es-ES":
							"Configurar el módulo de bienvenida (mensajes, canales, imagen)!",
						ko: "환영 모듈을 설정해요 (메시지, 채널, 이미지)!",
						uk: "Налаштувати модуль привітань (повідомлення, канали, зображення)!",
						de: "Konfiguriere das Willkommensmodul (Nachrichten, Kanäle, Bild)!",
						it: "Configura il modulo di benvenuto (messaggi, canali, immagine)!",
						"pt-BR":
							"Configure o módulo de boas-vindas (mensagens, canais, imagem)!",
						pl: "Skonfiguruj moduł powitań (wiadomości, kanały, obraz)!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "boost-message",

					description:
						"Configure the message sent when a member boosts or stops boosting!",
					description_localizations: {
						fr: "Configurer le message envoyé quand un membre boost ou arrête de booster",
						ja: "メンバーがブーストした時・ブーストをやめた時のメッセージを設定！",
						ru: "Настроить сообщение, когда участник бустит сервер или убирает буст!",
						"es-ES":
							"Configurar el mensaje enviado cuando un miembro mejora o deja de mejorar el servidor!",
						ko: "멤버가 부스트하거나 부스트를 멈출 때 보낼 메시지를 설정해요!",
						uk: "Налаштувати повідомлення, коли учасник бустить сервер або прибирає буст!",
						de: "Konfiguriere die Nachricht, wenn ein Mitglied boostet oder aufhört zu boosten!",
						it: "Configura il messaggio inviato quando un membro potenzia o smette di potenziare il server!",
						"pt-BR":
							"Configure a mensagem enviada quando um membro impulsiona ou deixa de impulsionar o servidor!",
						pl: "Skonfiguruj wiadomość, gdy członek boostuje serwer lub przestaje go boostować!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.Administrator
				}
			],

			permission: null
		},
		{
			name: "bot",

			description: "Set someting/behaviours in the bot!",
			description_localizations: {
				fr: "Définir quelque chose/comportements dans le bot!",
				ja: "ボット内の何か/行動を設定！",
				ru: "Установить что-либо в боте!",
				"es-ES": "Establecer algo/comportamientos en el bot!",
				ko: "봇의 설정과 동작을 변경해요!",
				uk: "Налаштувати щось у боті!",
				de: "Legt Einstellungen/Verhalten des Bots fest!",
				it: "Imposta qualcosa/comportamenti nel bot!",
				"pt-BR": "Define configurações/comportamentos do bot!",
				pl: "Ustawia opcje/zachowania bota!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,
			options: [
				{
					name: "prefix",

					description:
						"Change the message commands's prefix in this guild!",
					description_localizations: {
						fr: "Changer le préfixe des commande de message sur ce serveur",
						ja: "このサーバーのメッセージコマンドのプレフィックスを変更！",
						ru: "Изменить префикс текстовых команд на сервере!",
						"es-ES":
							"Cambiar el prefijo de los comandos de mensaje en este servidor!",
						ko: "이 서버의 메시지 명령어 접두사를 변경해요!",
						uk: "Змінити префікс текстових команд на цьому сервері!",
						de: "Ändere das Präfix der Nachrichtenbefehle auf diesem Server!",
						it: "Cambia il prefisso dei comandi testuali in questo server!",
						"pt-BR":
							"Altere o prefixo dos comandos de mensagem neste servidor!",
						pl: "Zmień prefiks komend tekstowych na tym serwerze!"
					},

					options: [
						{
							name: "action",

							description: "What do you want to do?",
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

							choices: [
								{
									name: `Default prefix`,
									name_localizations: {
										fr: "Préfixe par défaut",
										ja: "default_prefix",
										ru: "default_prefix",
										"es-ES": "default_prefix",
										ko: "기본 접두사",
										uk: "Типовий префікс",
										de: "Aktion",
										it: "azione",
										"pt-BR": "ação",
										pl: "akcja"
									},
									value: "mention"
								},
								{
									name: "Change prefix",
									name_localizations: {
										fr: "Changer le préfixe",
										ja: "change_prefix",
										ru: "change_prefix",
										"es-ES": "change_prefix",
										ko: "접두사 변경",
										uk: "Змінити префікс",
										de: "Präfix ändern",
										it: "Cambia prefisso",
										"pt-BR": "Alterar prefixo",
										pl: "Zmień prefiks"
									},
									value: "change"
								}
							],

							type: ApplicationCommandOptionType.String,
							required: true,

							permission: null
						},
						{
							name: "name",

							description: "The new prefix",
							description_localizations: {
								fr: "Le nouveau préfixe",
								ja: "新しいプレフィックス",
								ru: "Новый префикс",
								"es-ES": "El nuevo prefijo",
								ko: "새 접두사",
								uk: "Новий префікс",
								de: "Das neue Präfix",
								it: "Il nuovo prefisso",
								"pt-BR": "O novo prefixo",
								pl: "Nowy prefiks"
							},

							type: ApplicationCommandOptionType.String,
							required: false,

							permission: null
						}
					],

					type: ApplicationCommandOptionType.Subcommand,
					permission: PermissionFlagsBits.Administrator
				}
			],

			permission: null
		},
		{
			name: "config",

			description: "Subcommand for iHorizon's guild config restore/save",
			description_localizations: {
				fr: "Sous commande pour la réstauration/sauvegarde des configurations d'iHorizon",
				ja: "iHorizonのサーバー設定の復元/保存用サブコマンド",
				ru: "Подкоманда для сохранения/восстановления конфигурации iHorizon",
				"es-ES":
					"Subcomando para restaurar/guardar la configuración del servidor de iHorizon",
				ko: "iHorizon 서버 설정 저장/복원 하위 명령어",
				uk: "Підкоманда для збереження/відновлення конфігурації сервера iHorizon",
				de: "Unterbefehle zum Speichern/Wiederherstellen der iHorizon-Serverkonfiguration",
				it: "Sottocomandi per salvare/ripristinare la configurazione iHorizon del server",
				"pt-BR":
					"Subcomandos para salvar/restaurar a configuração do iHorizon do servidor",
				pl: "Podkomendy zapisu/przywracania konfiguracji iHorizon serwera"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: "show",

					description: "Get the guild configuration!",
					description_localizations: {
						fr: "Obtenez la configuration du serveur",
						ja: "サーバー設定を取得！",
						ru: "Получить конфигурацию сервера!",
						"es-ES": "Obtener la configuración del servidor!",
						ko: "서버 설정을 확인해요!",
						uk: "Отримати конфігурацію сервера!",
						de: "Zeige die Server-Konfiguration!",
						it: "Ottieni la configurazione del server!",
						"pt-BR": "Veja a configuração do servidor!",
						pl: "Pokaż konfigurację serwera!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "restore",

					description: "Restore an backup",
					description_localizations: {
						fr: "charger une backup de la configuration",
						ja: "バックアップを復元",
						ru: "Восстановить резервную копию",
						"es-ES": "Restaurar una copia de seguridad",
						ko: "백업 복원",
						uk: "Відновити резервну копію",
						de: "Ein Backup wiederherstellen",
						it: "Ripristina un backup",
						"pt-BR": "Restaurar um backup",
						pl: "Przywróć kopię zapasową"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "backup-to-load",

							description: "The backup to load",
							description_localizations: {
								fr: "La sauvegarde à restaurer",
								ja: "読み込むバックアップ",
								ru: "Резервная копия для загрузки",
								"es-ES": "La copia de seguridad a cargar",
								ko: "불러올 백업",
								uk: "Резервна копія для завантаження",
								de: "Das zu ladende Backup",
								it: "Il backup da caricare",
								"pt-BR": "O backup a carregar",
								pl: "Kopia zapasowa do wczytania"
							},

							type: ApplicationCommandOptionType.Attachment,

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "save",

					description: "Save a backup",
					description_localizations: {
						fr: "Sauvegarder une backup de la configuration actuel du serveur",
						ja: "バックアップを保存",
						ru: "Сохранить резервную копию",
						"es-ES": "Guardar una copia de seguridad",
						ko: "백업 저장",
						uk: "Зберегти резервну копію",
						de: "Ein Backup speichern",
						it: "Salva un backup",
						"pt-BR": "Salvar um backup",
						pl: "Zapisz kopię zapasową"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.Administrator
				}
			],

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: true,
	category: "guildconfig",
	type: ApplicationCommandType.ChatInput,

	permission: null
};

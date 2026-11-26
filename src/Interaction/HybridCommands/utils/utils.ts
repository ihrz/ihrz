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
	name: "utils",

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
			name: "avatar",

			description: "Pick the avatar of a user!",
			description_localizations: {
				fr: "Récuperer l'avatar d'un utilisateur",
				ja: "ユーザーのアバターを取得！",
				ru: "Взять аватар пользователя!",
				"es-ES": "Tomar el avatar de un usuario!",
				ko: "사용자의 아바타를 가져와요!",
				uk: "Отримати аватар користувача!",
				de: "Hol dir den Avatar eines Nutzers!",
				it: "Prendi l'avatar di un utente!",
				"pt-BR": "Pegue o avatar de um usuário!",
				pl: "Pobierz awatar użytkownika!"
			},

			aliases: ["pfp", "pp", "pic"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user",
					description_localizations: {
						fr: "L'utilisateur",
						ja: "ユーザー",
						ru: "Пользователь",
						"es-ES": "El usuario",
						ko: "사용자",
						uk: "Користувач",
						de: "Das Mitglied",
						it: "L'utente",
						"pt-BR": "O usuário",
						pl: "Użytkownik"
					},

					required: false,
					permission: null
				}
			],

			permission: null
		},
		{
			name: "vc",

			description: "Get the voice states of the guild!",
			description_localizations: {
				fr: "Obtenez les états des vocaux du serveur",
				ja: "サーバーのボイス状態を取得！",
				ru: "Получить состояния голосовых каналов!",
				"es-ES": "Obtener los estados de voz del servidor!",
				ko: "서버의 음성 상태를 확인해요!",
				uk: "Отримати голосові стани сервера!",
				de: "Zeige die Sprachstatus des Servers!",
				it: "Ottieni gli stati vocali del server!",
				"pt-BR": "Veja os estados de voz do servidor!",
				pl: "Pokaż stany głosowe serwera!"
			},

			options: [
				{
					name: "show-mode",

					description: "Show mode (large, brief)",
					description_localizations: {
						fr: "Mode d'affichage (complet, court)",
						ja: "表示モード（大、簡易）",
						ru: "Режим отображения (большой, краткий)",
						"es-ES": "Modo de visualización (grande, breve)",
						ko: "표시 방식 (자세히, 간단히)",
						uk: "Режим показу (детальний, короткий)",
						de: "Anzeigemodus (groß, kurz)",
						it: "Modalità di visualizzazione (ampia, breve)",
						"pt-BR": "Modo de exibição (grande, breve)",
						pl: "Tryb wyświetlania (duży, krótki)"
					},

					choices: [
						{
							name: "Large",
							name_localizations: {
								fr: "Complet",
								ja: "large",
								ru: "large",
								"es-ES": "large",
								ko: "크게",
								uk: "Детальний",
								de: "Groß",
								it: "Grande",
								"pt-BR": "Grande",
								pl: "Duży"
							},
							value: "large"
						},
						{
							name: "Short",
							name_localizations: {
								fr: "Court",
								ja: "short",
								ru: "short",
								"es-ES": "short",
								ko: "짧게",
								uk: "Короткий",
								de: "Kurz",
								it: "Breve",
								"pt-BR": "Curto",
								pl: "Krótki"
							},
							value: "short"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "vanity-generator",

			aliases: ["vanity", "vanity-gen", "customvanity"],

			description: "Get your own vanity URL in discord.wf format!",
			description_localizations: {
				fr: "Créer votre propre URL vanity sous le format discord.wf",
				ja: "discord.wf形式で自分のバニティURLを取得！",
				ru: "Получить вашу персональную ссылку в формате discord.wf!",
				"es-ES":
					"Obtener tu propia URL de vanidad en formato discord.wf!",
				ko: "discord.wf 형식의 나만의 맞춤 URL을 받아요!",
				uk: "Отримайте власне персональне посилання у форматі discord.wf!",
				de: "Hol dir deine eigene Vanity-URL im Format discord.wf!",
				it: "Ottieni il tuo URL personalizzato nel formato discord.wf!",
				"pt-BR":
					"Obtenha sua própria URL personalizada no formato discord.wf!",
				pl: "Zdobądź własny adres vanity w formacie discord.wf!"
			},

			options: [
				{
					name: "code",

					description: "Vanity URL code",
					description_localizations: {
						fr: "Le code du Vanity",
						ja: "バニティURLコード",
						ru: "Код персональной ссылки",
						"es-ES": "Código de URL de vanidad",
						ko: "맞춤 URL 코드",
						uk: "Код персонального посилання",
						de: "Vanity-URL-Code",
						it: "Codice dell'URL personalizzato",
						"pt-BR": "Código da URL personalizada",
						pl: "Kod niestandardowego adresu URL"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageGuild,

			cooldown: client.timeCalculator.to_ms("24hours")
		},
		{
			name: "userinfo",

			description: "Get information about a user!",
			description_localizations: {
				fr: "Obtenir des informations sur un utilisateur",
				ja: "ユーザーの情報を取得！",
				ru: "Получить информацию о пользователе!",
				"es-ES": "Obtener información sobre un usuario!",
				ko: "사용자 정보를 확인해요!",
				uk: "Отримати інформацію про користувача!",
				de: "Infos zu einem Nutzer anzeigen!",
				it: "Ottieni informazioni su un utente!",
				"pt-BR": "Veja informações sobre um usuário!",
				pl: "Pokaż informacje o użytkowniku!"
			},

			aliases: ["ui"],

			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "user you want to lookup",
					description_localizations: {
						fr: "utilisateur que vous souhaitez rechercher",
						ja: "検索したいユーザー",
						ru: "пользователь для поиска",
						"es-ES": "usuario que quieres buscar",
						ko: "조회할 사용자",
						uk: "користувач, якого потрібно знайти",
						de: "Das Mitglied, das du nachschlagen willst",
						it: "L'utente da cercare",
						"pt-BR": "O usuário que você quer consultar",
						pl: "Użytkownik do sprawdzenia"
					},

					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "snipe",

			description: "Get the last message deleted in this channel!",
			description_localizations: {
				fr: "Obtenez le dernier message supprimé sur ce cannal",
				ja: "このチャンネルで最後に削除されたメッセージを取得！",
				ru: "Получить последнее удаленное сообщение в канале!",
				"es-ES": "Obtener el último mensaje eliminado en este canal!",
				ko: "이 채널에서 마지막으로 삭제된 메시지를 확인해요!",
				uk: "Отримати останнє видалене повідомлення в цьому каналі!",
				de: "Zeige die zuletzt gelöschte Nachricht in diesem Kanal!",
				it: "Ottieni l'ultimo messaggio eliminato in questo canale!",
				"pt-BR": "Veja a última mensagem apagada neste canal!",
				pl: "Pokaż ostatnio usuniętą wiadomość na tym kanale!"
			},

			aliases: ["s", "snp"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "leash",

			description: "Leash a member in the guild",
			description_localizations: {
				fr: "Mettre en laisse un utilisateur sur le serveur",
				ja: "サーバー内のメンバーをリードでつなぐ",
				ru: "Привязать участника на сервере",
				"es-ES": "Atar a un miembro en el servidor",
				ko: "서버에서 멤버에게 목줄을 채워요",
				uk: "Взяти учасника сервера на повідець",
				de: "Ein Mitglied auf dem Server an die Leine legen",
				it: "Metti al guinzaglio un membro del server",
				"pt-BR": "Coloque um membro do servidor na coleira",
				pl: "Załóż smycz członkowi serwera"
			},

			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "member you want to leash",
					description_localizations: {
						fr: "utilisateur que vous souhaitez mettre en laisse",
						ja: "リードでつなぎたいメンバー",
						ru: "участник для привязки",
						"es-ES": "miembro que quieres atar",
						ko: "목줄을 채울 멤버",
						uk: "учасник, якого потрібно взяти на повідець",
						de: "Das Mitglied, das du an die Leine nimmst",
						it: "Il membro da mettere al guinzaglio",
						"pt-BR": "O membro que você quer pôr na coleira",
						pl: "Członek do wzięcia na smycz"
					},

					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "unleash",

			description: "UnLeash a member in the guild",
			description_localizations: {
				fr: "Enlever la laisse à un utilisateur sur le serveur",
				ja: "サーバー内のメンバーのリードを外す",
				ru: "Отвязать участника на сервере",
				"es-ES": "Desatar a un miembro en el servidor",
				ko: "서버에서 멤버의 목줄을 풀어요",
				uk: "Зняти учасника сервера з повідця",
				de: "Nimmt ein Mitglied des Servers von der Leine",
				it: "Libera un membro dal guinzaglio",
				"pt-BR": "Solta um membro da coleira",
				pl: "Spuszcza członka serwera ze smyczy"
			},

			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "member you want to unleash",
					description_localizations: {
						fr: "utilisateur que vous souhaitez supprimer sa laisse",
						ja: "リードを外したいメンバー",
						ru: "участник для отвязки",
						"es-ES": "miembro que quieres desatar",
						ko: "목줄을 풀 멤버",
						uk: "учасник, якого потрібно зняти з повідця",
						de: "Das Mitglied, das du von der Leine lässt",
						it: "Il membro da liberare dal guinzaglio",
						"pt-BR": "O membro que você quer soltar da coleira",
						pl: "Członek do spuszczenia ze smyczy"
					},

					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "dm",
			name_localizations: {
				fr: "mp",
				ja: "dm",
				ru: "dm",
				"es-ES": "dm",
				ko: "dm",
				uk: "dm",
				de: "dm",
				it: "dm",
				"pt-BR": "dm",
				pl: "dm"
			},

			description: "Send a private message to the user1",
			description_localizations: {
				fr: "Envoyer un message privée à un utilisateur",
				ja: "ユーザー1にプライベートメッセージを送信",
				ru: "Отправить личное сообщение пользователю1",
				"es-ES": "Enviar un mensaje privado al usuario1",
				ko: "user1에게 개인 메시지를 보내요",
				uk: "Надіслати приватне повідомлення користувачу1",
				de: "Sendet eine private Nachricht an das Mitglied",
				it: "Invia un messaggio privato all'utente",
				"pt-BR": "Envia uma mensagem privada ao usuário",
				pl: "Wysyła prywatną wiadomość do użytkownika"
			},

			options: [
				{
					name: "private",

					description: "is private ?",
					description_localizations: {
						fr: "l'autheur est-t'il anonyme ?",
						ja: "非公開ですか？",
						ru: "приватный?",
						"es-ES": "es privado?",
						ko: "비공개인가요?",
						uk: "приватне?",
						de: "Ist privat?",
						it: "È privato?",
						"pt-BR": "É privado?",
						pl: "Czy prywatne?"
					},

					choices: [
						{
							name: "Yes",
							name_localizations: {
								fr: "Oui",
								ja: "yes",
								ru: "yes",
								"es-ES": "yes",
								ko: "예",
								uk: "Так",
								de: "Ja",
								it: "Sì",
								"pt-BR": "Sim",
								pl: "Tak"
							},
							value: "yes"
						},
						{
							name: "No",
							name_localizations: {
								fr: "Non",
								ja: "no",
								ru: "no",
								"es-ES": "no",
								ko: "아니요",
								uk: "Ні",
								de: "Nein",
								it: "No",
								"pt-BR": "Não",
								pl: "Nie"
							},
							value: "no"
						}
					],
					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "member",

					description: "the member you want",
					description_localizations: {
						fr: "l'autheur que vous voulez",
						ja: "対象のメンバー",
						ru: "желаемый участник",
						"es-ES": "el miembro que deseas",
						ko: "원하는 멤버",
						uk: "бажаний учасник",
						de: "Das gewünschte Mitglied",
						it: "Il membro che vuoi",
						"pt-BR": "O membro que você quer",
						pl: "Wybrany członek"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				},
				{
					name: "message",

					description: "the private message",
					description_localizations: {
						fr: "le message",
						ja: "プライベートメッセージ",
						ru: "приватное сообщение",
						"es-ES": "el mensaje privado",
						ko: "개인 메시지",
						uk: "приватне повідомлення",
						de: "Die private Nachricht",
						it: "Il messaggio privato",
						"pt-BR": "A mensagem privada",
						pl: "Prywatna wiadomość"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator,

			type: ApplicationCommandOptionType.Subcommand,
			cooldown: client.timeCalculator.to_ms("2m")
		},
		{
			name: "wlroles",

			description: "Define allowed roles for addrole & delrole command",
			description_localizations: {
				fr: "Définir les rôles autorisés pour les commandes addrole et delrole",
				ja: "addrole と delrole コマンドの許可ロールを定義",
				ru: "Определить разрешенные роли для команд addrole и delrole",
				"es-ES":
					"Definir roles permitidos para los comandos addrole y delrole",
				ko: "addrole 및 delrole 명령어에 허용할 역할을 정해요",
				uk: "Визначити дозволені ролі для команд addrole і delrole",
				de: "Erlaubte Rollen für die Befehle addrole & delrole festlegen",
				it: "Definisci i ruoli consentiti per i comandi addrole e delrole",
				"pt-BR":
					"Defina os cargos permitidos para os comandos addrole e delrole",
				pl: "Zdefiniuj role dozwolone dla komend addrole i delrole"
			},

			aliases: ["wlrole"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "media-only",

			description:
				"Define channels for only pictures/videos sending (block other content)",
			description_localizations: {
				fr: "Définir des canaux pour l'envoi d'images/videos uniquement (bloquer d'autres contenus)",
				ja: "画像/動画のみ送信可能なチャンネルを定義（他のコンテンツをブロック）",
				ru: "Определить каналы только для картинок/видео (блокировать другое содержимое)",
				"es-ES":
					"Definir canales solo para enviar imágenes/videos (bloquear otro contenido)",
				ko: "사진/동영상만 보낼 수 있는 채널을 정해요 (다른 콘텐츠 차단)",
				uk: "Визначити канали лише для фото/відео (блокувати інший вміст)",
				de: "Kanäle nur für Bilder/Videos festlegen (anderes wird blockiert)",
				it: "Definisci canali solo per immagini/video (blocca altri contenuti)",
				"pt-BR":
					"Defina canais só para imagens/vídeos (bloqueia outros conteúdos)",
				pl: "Zdefiniuj kanały tylko na obrazy/filmy (inne treści są blokowane)"
			},

			aliases: ["piconly", "mediaonly"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "setmentionrole",

			description: "Give a specific role to the user who pings me!",
			description_localizations: {
				fr: "Donner un rôle spécifique à l'utilisateur qui me ping",
				ja: "ピンしたユーザーに特定のロールを付与！",
				ru: "Дать определенную роль тому, кто меня упомянет!",
				"es-ES": "Dar un rol específico al usuario que me mencione!",
				ko: "저를 멘션한 사용자에게 특정 역할을 부여해요!",
				uk: "Видати певну роль тому, хто мене згадає!",
				de: "Gib dem Nutzer, der mich pingt, eine bestimmte Rolle!",
				it: "Assegna un ruolo specifico all'utente che mi menziona!",
				"pt-BR": "Dê um cargo específico ao usuário que me mencionar!",
				pl: "Nadaj konkretną rolę użytkownikowi, który mnie spinguje!"
			},

			aliases: ["setrank", "setranks", "rankset"],

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
						},
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
						}
					],
					permission: null
				},
				{
					name: "roles",
					type: ApplicationCommandOptionType.Role,

					description: "The specific roles to give !",
					description_localizations: {
						fr: "Les rôles spécifiques à donner",
						ja: "付与する特定のロール！",
						ru: "Конкретные роли для выдачи!",
						"es-ES": "Los roles específicos a dar!",
						ko: "지급할 역할!",
						uk: "Ролі, які потрібно видати!",
						de: "Die bestimmten Rollen, die vergeben werden!",
						it: "I ruoli specifici da assegnare!",
						"pt-BR": "Os cargos específicos a dar!",
						pl: "Konkretne role do nadania!"
					},

					required: false,
					permission: null
				},
				{
					name: "part-of-nickname",
					type: ApplicationCommandOptionType.String,

					description:
						"La partie du surnom que vous souhaitez que la personne ait dans son surnom",
					description_localizations: {
						fr: "The part of the nickname you want the person to have in their nickname",
						ja: "相手のニックネームに含めたい部分",
						ru: "Часть ника, которую вы хотите видеть в нике человека",
						"es-ES":
							"La parte del apodo que deseas que la persona tenga en su apodo",
						ko: "상대의 별명에 포함되길 원하는 부분",
						uk: "Частина нікнейму, яку ви хочете бачити в нікнеймі людини",
						de: "Der Teil des Nicknames, den die Person haben soll",
						it: "La parte del nickname che la persona deve avere",
						"pt-BR": "A parte do apelido que a pessoa deve ter",
						pl: "Fragment pseudonimu, który ma mieć dana osoba"
					},

					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "renew",

			description:
				"Re-created a channels (cloning permission and all configurations). nuke equivalent",
			description_localizations: {
				fr: "Recréation d'un canal (autorisation de clonage et toutes les configurations)",
				ja: "チャンネルを再作成（権限と全設定をクローン）。nuke相当",
				ru: "Пересоздать канал (клонирование прав и всех настроек). Аналог nuke",
				"es-ES":
					"Recrear un canal (clonando permisos y todas las configuraciones). Equivalente a nuke",
				ko: "채널을 다시 만들어요 (권한과 모든 설정 복제). nuke와 같아요",
				uk: "Перестворити канал (зі збереженням прав і всіх налаштувань). Аналог nuke",
				de: "Erstellt einen Kanal neu (Rechte und Einstellungen geklont), wie nuke",
				it: "Ricrea un canale (clonando permessi e configurazioni), come nuke",
				"pt-BR":
					"Recria um canal (clonando permissões e configurações), como nuke",
				pl: "Odtwarza kanał (klonując uprawnienia i ustawienia), jak nuke"
			},

			aliases: ["r", "rnw"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "prevnames",

			description:
				"Lookup an Discord User, and see this previous username !",
			description_localizations: {
				fr: "Recherchez un utilisateur Discord et voyez ces noms d'utilisateur précédent",
				ja: "Discordユーザーを検索し、以前のユーザー名を確認！",
				ru: "Найти пользователя Discord и посмотреть его предыдущие имена!",
				"es-ES":
					"Buscar un usuario de Discord y ver su nombre de usuario anterior!",
				ko: "Discord 사용자를 조회하고 이전 사용자명을 확인해요!",
				uk: "Знайти користувача Discord і переглянути його попередні імена!",
				de: "Suche einen Discord-Nutzer und sieh seine früheren Namen!",
				it: "Cerca un utente Discord e guarda i suoi nomi precedenti!",
				"pt-BR":
					"Busque um usuário do Discord e veja seus nomes anteriores!",
				pl: "Wyszukaj użytkownika Discord i zobacz jego poprzednie nazwy!"
			},

			aliases: ["pvnames", "pvname", "prevname"],

			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "L'utilisateur que vous voulez rechercher",
					description_localizations: {
						fr: "user you want to see this previous username",
						ja: "検索したいユーザー",
						ru: "Пользователь, которого вы хотите найти",
						"es-ES": "El usuario que quieres buscar",
						ko: "검색할 사용자",
						uk: "Користувач, якого ви хочете знайти",
						de: "Der Nutzer, den du suchen möchtest",
						it: "L'utente che vuoi cercare",
						"pt-BR": "O usuário que você quer buscar",
						pl: "Użytkownik, którego chcesz wyszukać"
					},

					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "nickrole",

			description:
				"Give a roles to all user who have specified char in their username!",
			description_localizations: {
				fr: "Donnez un rôle à tous les utilisateurs qui ont un caractère spécifique dans leur nom d'utilisateur",
				ja: "ユーザー名に特定の文字を含む全ユーザーにロールを付与！",
				ru: "Выдать роли всем пользователям с указанными символами в имени!",
				"es-ES":
					"Dar roles a todos los usuarios que tengan un carácter específico en su nombre de usuario!",
				ko: "사용자명에 지정한 문자가 있는 모든 사용자에게 역할을 부여해요!",
				uk: "Видати ролі всім користувачам із вказаними символами в імені!",
				de: "Gib allen mit einem bestimmten Zeichen im Namen eine Rolle!",
				it: "Assegna un ruolo a chi ha un certo carattere nel nome utente!",
				"pt-BR":
					"Dê um cargo a quem tem um caractere específico no nome de usuário!",
				pl: "Nadaj rolę wszystkim z danym znakiem w nazwie użytkownika!"
			},

			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "The action you want to do",
					description_localizations: {
						fr: "L'action que vous souhaitez faire",
						ja: "実行したいアクション",
						ru: "Действие, которое вы хотите выполнить",
						"es-ES": "La acción que quieres realizar",
						ko: "실행할 작업",
						uk: "Дія, яку ви хочете виконати",
						de: "Die gewünschte Aktion",
						it: "L'azione che vuoi eseguire",
						"pt-BR": "A ação que você quer executar",
						pl: "Akcja, którą chcesz wykonać"
					},

					required: true,
					choices: [
						{
							name: "Add",
							name_localizations: {
								fr: "Ajouter",
								ja: "add",
								ru: "add",
								"es-ES": "add",
								ko: "추가",
								uk: "Додати",
								de: "Hinzufügen",
								it: "Aggiungi",
								"pt-BR": "Adicionar",
								pl: "Dodaj"
							},
							value: "add"
						},
						{
							name: "Remove",
							name_localizations: {
								fr: "Supprimer",
								ja: "remove",
								ru: "remove",
								"es-ES": "remove",
								ko: "제거",
								uk: "Видалити",
								de: "Entfernen",
								it: "Rimuovi",
								"pt-BR": "Remover",
								pl: "Usuń"
							},
							value: "sub"
						}
					],

					permission: null
				},
				{
					name: "nickname",
					type: ApplicationCommandOptionType.String,

					description: "The part including in the nickname",
					description_localizations: {
						fr: "La partie incluant dans le pseudo",
						ja: "ニックネームに含める部分",
						ru: "Часть, включаемая в никнейм",
						"es-ES": "La parte a incluir en el apodo",
						ko: "별명에 포함된 문자열",
						uk: "Частина, що міститься в нікнеймі",
						de: "Der im Spitznamen enthaltene Teil",
						it: "La parte contenuta nel nickname",
						"pt-BR": "A parte incluída no apelido",
						pl: "Fragment zawarty w pseudonimie"
					},

					required: true,

					permission: null
				},
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "The role you want to give",
					description_localizations: {
						fr: "Le rôle que vous souhaitez donner",
						ja: "付与したいロール",
						ru: "Роль, которую вы хотите выдать",
						"es-ES": "El rol que quieres dar",
						ko: "지급할 역할",
						uk: "Роль, яку ви хочете видати",
						de: "Die Rolle, die du vergeben willst",
						it: "Il ruolo da assegnare",
						"pt-BR": "O cargo que você quer dar",
						pl: "Rola do nadania"
					},

					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "massmove",

			description:
				"Move all members connected in a voice channel to another one",
			description_localizations: {
				fr: "Déplacer tous les membres connectés dans un canal vocal vers un autre",
				ja: "ボイスチャンネルに接続中の全メンバーを別のチャンネルに移動",
				ru: "Переместить всех участников из одного голосового канала в другой",
				"es-ES":
					"Mover todos los miembros conectados en un canal de voz a otro",
				ko: "음성 채널에 연결된 모든 멤버를 다른 채널로 옮겨요",
				uk: "Перемістити всіх учасників з одного голосового каналу в інший",
				de: "Alle Mitglieder eines Sprachkanals in einen anderen verschieben",
				it: "Sposta tutti i membri di un canale vocale in un altro",
				"pt-BR": "Mova todos os membros de um canal de voz para outro",
				pl: "Przenieś wszystkich członków kanału głosowego na inny"
			},

			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,

					channel_types: [ChannelType.GuildVoice],

					description: "The voice channel to move members to",
					description_localizations: {
						fr: "Le canal vocal où déplacer les membres",
						ja: "メンバーを移動する先のボイスチャンネル",
						ru: "Голосовой канал, куда перемещать участников",
						"es-ES": "El canal de voz al que mover miembros",
						ko: "멤버를 옮길 음성 채널",
						uk: "Голосовий канал, куди переміщувати учасників",
						de: "Sprachkanal, in den Mitglieder verschoben werden",
						it: "Canale vocale in cui spostare i membri",
						"pt-BR": "Canal de voz para onde mover os membros",
						pl: "Kanał głosowy, do którego przenieść członków"
					},

					required: true,

					permission: null
				},
				{
					name: "from",
					type: ApplicationCommandOptionType.Channel,

					channel_types: [ChannelType.GuildVoice],

					description: "The voice channel to move members from",
					description_localizations: {
						fr: "Le canal vocal d'où déplacer les membres",
						ja: "メンバーを移動する元のボイスチャンネル",
						ru: "Голосовой канал, откуда перемещать участников",
						"es-ES": "El canal de voz desde donde mover miembros",
						ko: "멤버를 옮겨 올 음성 채널",
						uk: "Голосовий канал, звідки переміщувати учасників",
						de: "Sprachkanal, aus dem Mitglieder verschoben werden",
						it: "Canale vocale da cui spostare i membri",
						"pt-BR": "Canal de voz de onde mover os membros",
						pl: "Kanał głosowy, z którego przenieść członków"
					},

					required: false,

					permission: null
				}
			],

			thinking: true,
			type: ApplicationCommandOptionType.Subcommand,
			permission: [
				PermissionFlagsBits.MoveMembers,
				PermissionFlagsBits.ModerateMembers
			],
			cooldown: client.timeCalculator.to_ms("5m")
		},
		{
			name: "massiverole",

			description: "Add/Remove roles to everyone on the server",
			description_localizations: {
				fr: "Ajouter/Supprimer des rôles pour tout le monde sur le serveur",
				ja: "サーバー内の全員にロールを追加/削除",
				ru: "Добавить/удалить роли всем на сервере",
				"es-ES": "Añadir/Quitar roles a todos en el servidor",
				ko: "서버의 모든 멤버에게 역할을 추가/제거해요",
				uk: "Додати/видалити ролі всім на сервері",
				de: "Rollen für alle auf dem Server hinzufügen/entfernen",
				it: "Aggiungi/rimuovi ruoli a tutti sul server",
				"pt-BR": "Adicione/remova cargos de todos no servidor",
				pl: "Dodaj/usuń role wszystkim na serwerze"
			},

			aliases: ["massrole", "massroles"],

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
							name: "Add",
							name_localizations: {
								fr: "Ajouter",
								ja: "add",
								ru: "add",
								"es-ES": "add",
								ko: "추가",
								uk: "Додати",
								de: "Hinzufügen",
								it: "Aggiungi",
								"pt-BR": "Adicionar",
								pl: "Dodaj"
							},
							value: "add"
						},
						{
							name: "Remove",
							name_localizations: {
								fr: "Supprimer",
								ja: "remove",
								ru: "remove",
								"es-ES": "remove",
								ko: "제거",
								uk: "Видалити",
								de: "Entfernen",
								it: "Rimuovi",
								"pt-BR": "Remover",
								pl: "Usuń"
							},
							value: "sub"
						}
					],

					permission: null
				},
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "The specified role you want to add",
					description_localizations: {
						fr: "Le rôle spécifié que vous souhaitez ajouter",
						ja: "追加したい指定ロール",
						ru: "Указанная роль для добавления",
						"es-ES": "El rol especificado que quieres añadir",
						ko: "추가할 역할",
						uk: "Роль, яку ви хочете додати",
						de: "Die angegebene Rolle, die du hinzufügen willst",
						it: "Il ruolo indicato da aggiungere",
						"pt-BR": "O cargo indicado que você quer adicionar",
						pl: "Wskazana rola do dodania"
					},

					required: true,

					permission: null
				}
			],

			thinking: true,
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,

			cooldown: client.timeCalculator.to_ms("5m")
		},
		{
			name: "serverinfo",

			description: "Get information about the server!",
			description_localizations: {
				fr: "Obtenir des informations sur le serveur",
				ja: "サーバーの情報を取得！",
				ru: "Получить информацию о сервере!",
				"es-ES": "Obtener información sobre el servidor!",
				ko: "서버 정보를 확인해요!",
				uk: "Отримати інформацію про сервер!",
				de: "Infos zum Server anzeigen!",
				it: "Ottieni informazioni sul server!",
				"pt-BR": "Veja informações sobre o servidor!",
				pl: "Pokaż informacje o serwerze!"
			},

			aliases: ["si", "gi"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "emojis",

			description: "Add emojis to your server easly",
			description_localizations: {
				fr: "Ajoutez facilement des emojis à votre serveur",
				ja: "サーバーに絵文字を簡単に追加",
				ru: "Легко добавить эмодзи на сервер",
				"es-ES": "Añadir emojis a tu servidor fácilmente",
				ko: "서버에 이모지를 쉽게 추가해요",
				uk: "Легко додавайте емодзі на свій сервер",
				de: "Füge deinem Server ganz einfach Emojis hinzu",
				it: "Aggiungi emoji al tuo server facilmente",
				"pt-BR": "Adicione emojis ao seu servidor facilmente",
				pl: "Łatwo dodawaj emotki na swój serwer"
			},

			aliases: ["addemoji", "create", "addemojis", "emoji", "emote"],

			options: [
				{
					name: "emojis",
					type: ApplicationCommandOptionType.String,

					description: "What the emoji then?",
					description_localizations: {
						fr: "C'est quoi cette emoji alors ?",
						ja: "どの絵文字ですか？",
						ru: "Какой эмодзи?",
						"es-ES": "Cual es el emoji entonces?",
						ko: "어떤 이모지인가요?",
						uk: "Який емодзі?",
						de: "Welches Emoji dann?",
						it: "Quale emoji allora?",
						"pt-BR": "Qual emoji então?",
						pl: "Jakie więc emoji?"
					},

					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuildExpressions
		},
		{
			name: "embed",
			description: "Create a beautiful embed!",
			description_localizations: {
				fr: "Créez un magnifique embed",
				ja: "美しい埋め込みを作成！",
				ru: "Создать красивый эмбед!",
				"es-ES": "Crear un embed hermoso!",
				ko: "멋진 임베드를 만들어요!",
				uk: "Створити гарний ембед!",
				de: "Erstelle ein schönes Embed!",
				it: "Crea un bell'embed!",
				"pt-BR": "Crie um embed bonito!",
				pl: "Utwórz ładny embed!"
			},
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,
					description: "If you have an embed's ID!",
					description_localizations: {
						fr: "Si vous disposez d\'un identifiant d\'un embed précèdement enregistrer",
						ja: "埋め込みのIDがある場合！",
						ru: "Если у вас есть ID эмбеда!",
						"es-ES": "Si tienes un ID de embed!",
						ko: "임베드 ID가 있다면 입력하세요!",
						uk: "Якщо у вас є ID ембеда!",
						de: "Falls du eine Embed-ID hast!",
						it: "Se hai l'ID di un embed!",
						"pt-BR": "Se você tiver o ID de um embed!",
						pl: "Jeśli masz ID embeda!"
					},
					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "derank",

			description: "Remove all roles of an members",
			description_localizations: {
				fr: "Supprimer tous les rôles d'un membre",
				ja: "メンバーの全ロールを削除",
				ru: "Удалить все роли у участников",
				"es-ES": "Eliminar todos los roles de los miembros",
				ko: "멤버의 모든 역할을 제거해요",
				uk: "Видалити всі ролі учасника",
				de: "Alle Rollen eines Mitglieds entfernen",
				it: "Rimuovi tutti i ruoli di un membro",
				"pt-BR": "Remova todos os cargos de um membro",
				pl: "Usuń wszystkie role członka"
			},

			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The user",
					description_localizations: {
						fr: "l'utilisateur",
						ja: "ユーザー",
						ru: "Пользователь",
						"es-ES": "El usuario",
						ko: "사용자",
						uk: "Користувач",
						de: "Das Mitglied",
						it: "L'utente",
						"pt-BR": "O usuário",
						pl: "Użytkownik"
					},

					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "admin-users",

			description:
				"Get the list of all guild member whose have admin permissions",
			description_localizations: {
				fr: "Obtenez la liste de tous les membres de la guilde disposant d'autorisations d'administrateur",
				ja: "管理者権限を持つ全サーバーメンバーのリストを取得",
				ru: "Получить список всех участников с правами администратора",
				"es-ES":
					"Obtener la lista de todos los miembros del servidor que tienen permisos de administrador",
				ko: "관리자 권한이 있는 모든 서버 멤버 목록을 확인해요",
				uk: "Отримати список усіх учасників сервера з правами адміністратора",
				de: "Liste aller Mitglieder mit Admin-Rechten anzeigen",
				it: "Ottieni l'elenco dei membri con permessi admin",
				"pt-BR": "Veja a lista dos membros com permissões de admin",
				pl: "Pokaż listę członków z uprawnieniami admina"
			},

			aliases: ["alladmin", "allperms", "alladmins", "adminusers"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "allbots",

			description: "Get the list of all bot in the guild",
			description_localizations: {
				fr: "Obtenez la liste de tous les bot de la guilde",
				ja: "サーバー内の全ボットのリストを取得",
				ru: "Получить список всех ботов на сервере",
				"es-ES": "Obtener la lista de todos los bots en el servidor",
				ko: "서버의 모든 봇 목록을 확인해요",
				uk: "Отримати список усіх ботів на сервері",
				de: "Liste aller Bots auf dem Server anzeigen",
				it: "Ottieni l'elenco di tutti i bot nel server",
				"pt-BR": "Veja a lista de todos os bots do servidor",
				pl: "Pokaż listę wszystkich botów na serwerze"
			},

			aliases: ["allb", "bots"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "addrole",
			prefixName: "addrole",

			description: "Add role to user",
			description_localizations: {
				fr: "Ajouter un rôle à un utilisateur",
				ja: "ユーザーにロールを追加",
				ru: "Добавить роль пользователю",
				"es-ES": "Añadir rol al usuario",
				ko: "사용자에게 역할 추가",
				uk: "Додати роль користувачу",
				de: "Rolle zu Nutzer hinzufügen",
				it: "Aggiungi ruolo a un utente",
				"pt-BR": "Adicionar cargo a um usuário",
				pl: "Dodaj rolę użytkownikowi"
			},

			options: [
				{
					name: "user",

					description: "The user you want to add role",
					description_localizations: {
						fr: "L'utilisateur que vous voulez ajouter le rôle",
						ja: "ロールを追加したいユーザー",
						ru: "Пользователь, которому нужно добавить роль",
						"es-ES": "El usuario al que quieres añadir rol",
						ko: "역할을 추가할 사용자",
						uk: "Користувач, якому потрібно додати роль",
						de: "Das Mitglied, dem du eine Rolle geben willst",
						it: "L'utente a cui aggiungere un ruolo",
						"pt-BR": "O usuário a quem você quer dar um cargo",
						pl: "Użytkownik, któremu dodać rolę"
					},

					type: ApplicationCommandOptionType.User,

					required: true,

					permission: null
				},
				{
					name: "role",

					description: "The role you want to add to the user",
					description_localizations: {
						fr: "Le role que vous voulez ajouter a l'utilisateur",
						ja: "ユーザーに追加したいロール",
						ru: "Роль для добавления пользователю",
						"es-ES": "El rol que quieres añadir al usuario",
						ko: "사용자에게 추가할 역할",
						uk: "Роль, яку потрібно додати користувачу",
						de: "Die Rolle, die dem Mitglied hinzugefügt wird",
						it: "Il ruolo da aggiungere all'utente",
						"pt-BR": "O cargo que você quer dar ao usuário",
						pl: "Rola do dodania użytkownikowi"
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
			name: "delrole",

			description: "Removew role to user",
			description_localizations: {
				fr: "Enlever un rôle à un utilisateur",
				ja: "ユーザーからロールを削除",
				ru: "Удалить роль у пользователя",
				"es-ES": "Quitar rol al usuario",
				ko: "사용자의 역할 제거",
				uk: "Видалити роль у користувача",
				de: "Rolle von Nutzer entfernen",
				it: "Rimuovi ruolo a un utente",
				"pt-BR": "Remover cargo de um usuário",
				pl: "Usuń rolę użytkownikowi"
			},

			options: [
				{
					name: "user",

					description: "The user you want to remove role",
					description_localizations: {
						fr: "L'utilisateur que vous voulez enlever le rôle",
						ja: "ロールを削除したいユーザー",
						ru: "Пользователь, у которого нужно удалить роль",
						"es-ES": "El usuario al que quieres quitar el rol",
						ko: "역할을 제거할 사용자",
						uk: "Користувач, у якого потрібно видалити роль",
						de: "Das Mitglied, dem du eine Rolle entziehen willst",
						it: "L'utente a cui rimuovere un ruolo",
						"pt-BR": "O usuário de quem você quer remover um cargo",
						pl: "Użytkownik, któremu odebrać rolę"
					},

					type: ApplicationCommandOptionType.User,

					required: true,

					permission: null
				},
				{
					name: "role",

					description: "The role you want to remove to the user",
					description_localizations: {
						fr: "Le role que vous voulez enlever a l'utilisateur",
						ja: "ユーザーから削除したいロール",
						ru: "Роль, которую нужно убрать у пользователя",
						"es-ES": "El rol que quieres quitar al usuario",
						ko: "사용자에게서 제거할 역할",
						uk: "Роль, яку потрібно видалити в користувача",
						de: "Die Rolle, die dem Mitglied entzogen wird",
						it: "Il ruolo da rimuovere all'utente",
						"pt-BR": "O cargo que você quer remover do usuário",
						pl: "Rola do odebrania użytkownikowi"
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
			name: "zip-emojis",

			description: "Create zip files with all guild emojis in!",
			description_localizations: {
				fr: "Créer un fichier zip contenant absolument tout les émojis du serveur",
				ja: "サーバーの全絵文字を含むZIPファイルを作成！",
				ru: "Создать ZIP-файлы со всеми эмодзи сервера!",
				"es-ES":
					"Crear archivos zip con todos los emojis del servidor!",
				ko: "서버의 모든 이모지를 담은 zip 파일을 만들어요!",
				uk: "Створити ZIP-файли з усіма емодзі сервера!",
				de: "Erstelle eine ZIP-Datei mit allen Server-Emojis!",
				it: "Crea uno zip con tutte le emoji del server!",
				"pt-BR": "Crie um zip com todos os emojis do servidor!",
				pl: "Utwórz plik ZIP ze wszystkimi emotkami serwera!"
			},

			aliases: ["zipemojis", "zip1"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuildExpressions,

			thinking: true
		}
	],

	category: "utils",
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null
};

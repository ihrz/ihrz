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
import { cooldown } from "../../../core/functions/helper.js";

export const command: Command = {
	name: "utils",

	description: "SubCommand category for utils command",
	description_localizations: {
		fr: "Commande sous groupé pour la catégorie utilitaire",
		ja: "ユーティリティコマンドのサブコマンドカテゴリ",
		ru: "Категория подкоманд для утилит",
		"es-ES": "Categoría de subcomando para comandos de utilidad",
		ko: "유틸리티 명령어의 하위 명령어"
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
				ko: "사용자의 아바타를 가져와요!"
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
						ko: "사용자"
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
				ko: "서버의 음성 상태를 확인해요!"
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
						ko: "표시 방식 (자세히, 간단히)"
					},

					choices: [
						{
							name: "Large",
							name_localizations: {
								fr: "Complet",
								ja: "large",
								ru: "large",
								"es-ES": "large",
								ko: "크게"
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
								ko: "짧게"
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
				ko: "discord.wf 형식의 나만의 맞춤 URL을 받아요!"
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
						ko: "맞춤 URL 코드"
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
				ko: "사용자 정보를 확인해요!"
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
						ko: "조회할 사용자"
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
				ko: "이 채널에서 마지막으로 삭제된 메시지를 확인해요!"
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
				ko: "서버에서 멤버에게 목줄을 채워요"
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
						ko: "목줄을 채울 멤버"
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
				ko: "서버에서 멤버의 목줄을 풀어요"
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
						ko: "목줄을 풀 멤버"
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
				ko: "dm"
			},

			description: "Send a private message to the user1",
			description_localizations: {
				fr: "Envoyer un message privée à un utilisateur",
				ja: "ユーザー1にプライベートメッセージを送信",
				ru: "Отправить личное сообщение пользователю1",
				"es-ES": "Enviar un mensaje privado al usuario1",
				ko: "user1에게 개인 메시지를 보내요"
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
						ko: "비공개인가요?"
					},

					choices: [
						{
							name: "Yes",
							name_localizations: {
								fr: "Oui",
								ja: "yes",
								ru: "yes",
								"es-ES": "yes",
								ko: "예"
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
								ko: "아니요"
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
						ko: "원하는 멤버"
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
						ko: "개인 메시지"
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
				ko: "addrole 및 delrole 명령어에 허용할 역할을 정해요"
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
				ko: "사진/동영상만 보낼 수 있는 채널을 정해요 (다른 콘텐츠 차단)"
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
				ko: "저를 멘션한 사용자에게 특정 역할을 부여해요!"
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
						ko: "무엇을 할까요?"
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
								ko: "끄기"
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
								ko: "켜기"
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
						ko: "지급할 역할!"
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
						ko: "상대의 별명에 포함되길 원하는 부분"
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
				ko: "채널을 다시 만들어요 (권한과 모든 설정 복제). nuke와 같아요"
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
				ko: "Discord 사용자를 조회하고 이전 사용자명을 확인해요!"
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
						ko: "검색할 사용자"
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
				ko: "사용자명에 지정한 문자가 있는 모든 사용자에게 역할을 부여해요!"
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
						ko: "실행할 작업"
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
								ko: "추가"
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
								ko: "제거"
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
						ko: "별명에 포함된 문자열"
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
						ko: "지급할 역할"
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
				ko: "음성 채널에 연결된 모든 멤버를 다른 채널로 옮겨요"
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
						ko: "멤버를 옮길 음성 채널"
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
						ko: "멤버를 옮겨 올 음성 채널"
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
				ko: "서버의 모든 멤버에게 역할을 추가/제거해요"
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
						ko: "무엇을 할까요?"
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
								ko: "추가"
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
								ko: "제거"
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
						ko: "추가할 역할"
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
				ko: "서버 정보를 확인해요!"
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
				ko: "서버에 이모지를 쉽게 추가해요"
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
						ko: "어떤 이모지인가요?"
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
				ko: "멋진 임베드를 만들어요!"
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
						ko: "임베드 ID가 있다면 입력하세요!"
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
				ko: "멤버의 모든 역할을 제거해요"
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
						ko: "사용자"
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
				ko: "관리자 권한이 있는 모든 서버 멤버 목록을 확인해요"
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
				ko: "서버의 모든 봇 목록을 확인해요"
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
				ko: "사용자에게 역할 추가"
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
						ko: "역할을 추가할 사용자"
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
						ko: "사용자에게 추가할 역할"
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
				ko: "사용자의 역할 제거"
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
						ko: "역할을 제거할 사용자"
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
						ko: "사용자에게서 제거할 역할"
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
				ko: "서버의 모든 이모지를 담은 zip 파일을 만들어요!"
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

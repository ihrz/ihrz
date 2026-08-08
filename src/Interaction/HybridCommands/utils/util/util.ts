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
		"es-ES": "Categoría de subcomando para comandos de utilidad"
	},

	options: [
		{
			name: "allwebhooks",

			description: "List all registered webhook on the server",
			description_localizations: {
				fr: "Afficher toute les webhooks enregistrer sur le serveur",
				ja: "サーバーに登録された全Webhookを一覧表示",
				ru: "Показать все вебхуки на сервере",
				"es-ES": "Listar todos los webhooks registrados en el servidor"
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
				"es-ES": "Expulsar a un usuario si su apodo contiene una palabra específica"
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
				"es-ES": "Crear archivos zip con todos los stickers del servidor!"
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
				"es-ES": "Desconectar a un miembro de un canal de voz"
			},

			options: [
				{
					name: "member",

					description: "The member you want to disconnect",
					description_localizations: {
						fr: "Le membre que vous voulez déconnecter",
						ja: "切断したいメンバー",
						ru: "Участник для отключения",
						"es-ES": "El miembro que quieres desconectar"
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
				"es-ES": "Despertar a un usuario moviéndolo masivamente de forma aleatoria en el canal de voz"
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
						"es-ES": "El miembro a despertar"
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
				"es-ES": "Crear un rol de falso administrador gestionado por iHorizon"
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
				"es-ES": "Renovar automáticamente un canal X veces"
			},

			options: [
				{
					name: "channel",

					description: "The channel to renew every x times",
					description_localizations: {
						fr: "Le salon qui ce renouveleras x temps",
						ja: "X回ごとに更新するチャンネル",
						ru: "Канал для обновления каждые X раз",
						"es-ES": "El canal a renovar cada X veces"
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
						"es-ES": "Las X veces"
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
				"es-ES": "Obtener la lista de todos los roles del servidor que tienen permisos de administrador"
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
				"es-ES": "Establecer un enfriamiento en el canal actual"
			},

			aliases: ["setcooldown", "coldown", "slow", "slowmode"],

			options: [
				{
					name: "duration",
					name_localizations: {
						fr: "durée",
						ja: "duration",
						ru: "duration",
						"es-ES": "duration"
					},

					description: "The duration of the slowmode",
					description_localizations: {
						fr: "La durée du slow mode",
						ja: "低速モードの時間",
						ru: "Длительность замедленного режима",
						"es-ES": "La duración del modo lento"
					},

					choices: [
						{
							name: "None",
							value: "0",
							name_localizations: {
								fr: "Aucun",
								ja: "none",
								ru: "none",
								"es-ES": "none"
							}
						},
						{
							name: "5 seconds",
							value: "5s",
							name_localizations: {
								fr: "5 secondes",
								ja: "5_seconds",
								ru: "5_seconds",
								"es-ES": "5_seconds"
							}
						},
						{
							name: "10 seconds",
							value: "10s",
							name_localizations: {
								fr: "10 secondes",
								ja: "10_seconds",
								ru: "10_seconds",
								"es-ES": "10_seconds"
							}
						},
						{
							name: "15 seconds",
							value: "15s",
							name_localizations: {
								fr: "15 secondes",
								ja: "15_seconds",
								ru: "15_seconds",
								"es-ES": "15_seconds"
							}
						},
						{
							name: "30 seconds",
							value: "30s",
							name_localizations: {
								fr: "30 secondes",
								ja: "30_seconds",
								ru: "30_seconds",
								"es-ES": "30_seconds"
							}
						},
						{
							name: "1 minute",
							value: "1m",
							name_localizations: {
								fr: "1 minute",
								ja: "1_minute",
								ru: "1_minute",
								"es-ES": "1_minute"
							}
						},
						{
							name: "2 minutes",
							value: "2m",
							name_localizations: {
								fr: "2 minutes",
								ja: "2_minutes",
								ru: "2_minutes",
								"es-ES": "2_minutes"
							}
						},
						{
							name: "5 minutes",
							value: "5m",
							name_localizations: {
								fr: "5 minutes",
								ja: "5_minutes",
								ru: "5_minutes",
								"es-ES": "5_minutes"
							}
						},
						{
							name: "10 minutes",
							value: "10m",
							name_localizations: {
								fr: "10 minutes",
								ja: "10_minutes",
								ru: "10_minutes",
								"es-ES": "10_minutes"
							}
						},
						{
							name: "15 minutes",
							value: "15m",
							name_localizations: {
								fr: "15 minutes",
								ja: "15_minutes",
								ru: "15_minutes",
								"es-ES": "15_minutes"
							}
						},
						{
							name: "30 minutes",
							value: "30m",
							name_localizations: {
								fr: "30 minutes",
								ja: "30_minutes",
								ru: "30_minutes",
								"es-ES": "30_minutes"
							}
						},
						{
							name: "1 hour",
							value: "1h",
							name_localizations: {
								fr: "1 heure",
								ja: "1_hour",
								ru: "1_hour",
								"es-ES": "1_hour"
							}
						},
						{
							name: "2 hours",
							value: "2h",
							name_localizations: {
								fr: "2 heures",
								ja: "2_hours",
								ru: "2_hours",
								"es-ES": "2_hours"
							}
						},
						{
							name: "6 hours",
							value: "6h",
							name_localizations: {
								fr: "6 heures",
								ja: "6_hours",
								ru: "6_hours",
								"es-ES": "6_hours"
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
				"es-ES": "Limitar el número de miembros en el mismo rol"
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
						"es-ES": "El rol que quieres gestionar"
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
						"es-ES": "El máximo de miembros que deseas en el mismo rol"
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
				"es-ES": "Enviar el canal donde está el miembro"
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
						"es-ES": "El miembro que quieres comprobar"
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
				"es-ES": "Enviar la imagen del servidor"
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
				"es-ES": "Recrear todos los emojis desde un archivo zip"
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
						"es-ES": "El archivo zip para recrear emojis"
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
				"es-ES": "Sincronizar todos los canales con la categoría principal"
			},

			options: [
				{
					name: "category",

					description: "The category to sync channels to",
					description_localizations: {
						fr: "La catégorie pour synchroniser les channels",
						ja: "チャンネルを同期するカテゴリ",
						ru: "Категория для синхронизации каналов",
						"es-ES": "La categoría a la que sincronizar los canales"
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
				"es-ES": "Añadir un rol a todos los usuarios que reaccionaron a un mensaje específico"
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
						"es-ES": "El ID del mensaje para comprobar las reacciones"
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
						"es-ES": "El rol a añadir a los usuarios"
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
				"es-ES": "Obtener información sobre el enlace de invitación de Discord"
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
						"es-ES": "la invitación / código de Discord"
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
				"es-ES": "Ver todos los miembros del servidor que tienen los mismos roles"
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
						"es-ES": "El rol que quieres comprobar"
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
				"es-ES": "Distribuir aleatoriamente miembros de un canal de voz a todos los canales de voz en una categoría"
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
						"es-ES": "El canal de voz de origen para mover miembros"
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
						"es-ES": "La categoría que contiene los canales de voz a los que distribuir miembros"
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
				"es-ES": "Habilitar el modo de conversación en tu canal de voz actual"
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
				"es-ES": "Deshabilitar el modo de conversación y desilenciar a todos"
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
				"es-ES": "Congelar el acceso a tu canal de voz actual"
			},

			aliases: ["voicefreeze", "vcfreeze"],
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
				"es-ES": "Permitir a un miembro unirse al canal de voz congelado"
			},

			options: [
				{
					name: "member",
					description: "The member you want to allow",
					description_localizations: {
						fr: "Le membre que vous voulez autoriser",
						ja: "許可したいメンバー",
						ru: "Участник, которого вы хотите разрешить",
						"es-ES": "El miembro que quieres permitir"
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
				"es-ES": "Eliminar a un miembro de la lista blanca del canal de voz congelado"
			},

			options: [
				{
					name: "member",
					description: "The member you want to remove",
					description_localizations: {
						fr: "Le membre que vous voulez retirer",
						ja: "削除したいメンバー",
						ru: "Участник для удаления",
						"es-ES": "El miembro que quieres eliminar"
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
				"es-ES": "Eliminar la congelación de voz activa"
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
				"es-ES": "Mover a un usuario de un canal de voz."
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
						"es-ES": "El miembro que quieres mover"
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
						"es-ES": "El canal que deseas"
					},

					permission: null,
					type: ApplicationCommandOptionType.Channel,
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

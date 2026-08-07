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
	name: "mod",

	description: "Subcommand for moderation category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de modération",
		ja: "モデレーションカテゴリのサブコマンド！",
		ru: "Подкоманда для категории модерации!",
		"es-ES": "Subcomando para la categoría de moderación!"
	},

	options: [
		{
			name: "ban",

			description: "Ban a user!",
			description_localizations: {
				fr: "Bannir un utilisateur",
				ja: "ユーザーをバン！",
				ru: "Забанить пользователя!",
				"es-ES": "Banear a un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to ban",
					description_localizations: {
						fr: "le membre que vous souhaitez bannir",
						ja: "バンしたいメンバー",
						ru: "участник для бана",
						"es-ES": "el miembro que quieres banear"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "the reason of the bannisement",
					description_localizations: {
						fr: "la raison du ban",
						ja: "バンの理由",
						ru: "причина бана",
						"es-ES": "la razón del baneo"
					},

					required: false,

					permission: null
				}
			],

			aliases: ["addban", "createban"],
			permission: PermissionFlagsBits.BanMembers
		},
		{
			name: "baninfo",

			description: "Check if user is banned and why",
			description_localizations: {
				fr: "Vérifier si l'utilisateur est bannis du serveur et pourquoi",
				ja: "ユーザーがバンされているかとその理由を確認",
				ru: "Проверить, забанен ли пользователь и почему",
				"es-ES": "Comprobar si el usuario está baneado y por qué"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to check",
					description_localizations: {
						fr: "le membre que vous souhaitez vérifier",
						ja: "確認したいメンバー",
						ru: "участник для проверки",
						"es-ES": "el miembro que quieres comprobar"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.BanMembers
		},
		{
			name: "banlist",

			description: "Show a list with all banned member",
			description_localizations: {
				fr: "Affiche une liste des gens bannis",
				ja: "バンされた全メンバーのリストを表示",
				ru: "Показать список забаненных участников",
				"es-ES": "Mostrar una lista con todos los miembros baneados"
			},

			aliases: ["bans", "listban", "listbans", "banlists"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "clear",

			description: "Clear a amount of message in the channel !",
			description_localizations: {
				fr: "Effacer une quantité de message dans le cannal",
				ja: "チャンネル内のメッセージを一括削除！",
				ru: "Очистить количество сообщений в канале!",
				"es-ES": "Limpiar una cantidad de mensajes en el canal!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "number",
					type: ApplicationCommandOptionType.Number,

					description: "The number of message you want to delete !",
					description_localizations: {
						fr: "Le nombre de messages que vous souhaitez supprimer",
						ja: "削除したいメッセージ数！",
						ru: "Количество сообщений для удаления!",
						"es-ES": "El número de mensajes que quieres eliminar!"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member you want to delete the message",
					description_localizations: {
						fr: "Le membre dont vous souhaitez supprimer les messages",
						ja: "メッセージを削除したいメンバー",
						ru: "Участник, чьи сообщения удалить",
						"es-ES": "El miembro del que quieres eliminar el mensaje"
					},

					required: false,

					permission: null
				}
			],

			aliases: ["cls"],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "mutelist",

			aliases: ["allmute", "allmutes", "alltimeout", "alltimeouts"],

			description: "Show a list with all muted member",
			description_localizations: {
				fr: "Affiche une liste des gens mise en sourdine",
				ja: "ミュートされた全メンバーのリストを表示",
				ru: "Показать список замученных участников",
				"es-ES": "Mostrar una lista con todos los miembros silenciados"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "kick",

			description: "Kick a user!",
			description_localizations: {
				fr: "Expulser un utilisateur",
				ja: "ユーザーをキック！",
				ru: "Кикнуть пользователя!",
				"es-ES": "Expulsar a un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to kick",
					description_localizations: {
						fr: "le membre que vous voulez expulser",
						ja: "キックしたいメンバー",
						ru: "участник для кика",
						"es-ES": "el miembro que quieres expulsar"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "the reason of the kick",
					description_localizations: {
						fr: "la raison du kick",
						ja: "キックの理由",
						ru: "причина кика",
						"es-ES": "la razón de la expulsión"
					},

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.KickMembers
		},
		{
			name: "lock",

			description:
				"Remove ability to speak of all users in this text channel!",
			description_localizations: {
				fr: "Supprimer la possibilité de parler de tous les utilisateurs de ce channel",
				ja: "このテキストチャンネルで全ユーザーの発言権限を削除！",
				ru: "Убрать возможность говорить у всех в этом текстовом канале!",
				"es-ES": "Quitar la capacidad de hablar a todos los usuarios en este canal de texto!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "lock-all",

			description:
				"Remove ability to speak of all users in all channels!",
			description_localizations: {
				fr: "Supprimer la possibilité de parler de tous les utilisateurs sur tous les channel",
				ja: "全チャンネルで全ユーザーの発言権限を削除！",
				ru: "Убрать возможность говорить у всех во всех каналах!",
				"es-ES": "Quitar la capacidad de hablar a todos los usuarios en todos los canales!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			aliases: ["lockall"],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "unlock-all",

			description:
				"Give ability to speak of all users in all channels!",
			description_localizations: {
				fr: "Donner la possibilité de parler de tous les utilisateurs sur tous les channels",
				ja: "全チャンネルで全ユーザーに発言権限を付与！",
				ru: "Дать возможность говорить всем во всех каналах!",
				"es-ES": "Dar capacidad de hablar a todos los usuarios en todos los canales!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			aliases: ["unlockall"],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "tempmute",

			description: "Temporarily mute a user!",
			description_localizations: {
				fr: "Couper temporairement la possibilité d'envoyer des message pour un utilisateur",
				ja: "ユーザーを一時的にミュート！",
				ru: "Временно замутить пользователя!",
				"es-ES": "Silenciar temporalmente a un usuario!"
			},

			aliases: ["mute"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to unmuted",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez dé-mute textuellement",
						ja: "ミュート解除したいユーザー",
						ru: "Пользователь для размута",
						"es-ES": "El usuario que quieres desilenciar"
					},

					required: true,

					permission: null
				},
				{
					name: "time",
					type: ApplicationCommandOptionType.String,

					description: "the duration of the user's tempmute",
					description_localizations: {
						fr: "la durée du tempmute de l'utilisateur",
						ja: "ユーザーの一時的ミュート期間",
						ru: "длительность временного мута",
						"es-ES": "la duración del silencio temporal"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "the reason why you tempmuted",
					description_localizations: {
						fr: "la raison du tempmute",
						ja: "一時的ミュートの理由",
						ru: "причина временного мута",
						"es-ES": "la razón del silencio temporal"
					},

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unban",

			description: "Unban a user!",
			description_localizations: {
				fr: "Annuler le bannissement d'un utilisateur",
				ja: "ユーザーのバンを解除！",
				ru: "Разбанить пользователя!",
				"es-ES": "Desbanear a un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "userid",
					type: ApplicationCommandOptionType.String,

					description: "The id of the user you want to unban !",
					description_localizations: {
						fr: "L'identifiant de l'utilisateur que vous souhaitez débannir",
						ja: "バン解除したいユーザーのID！",
						ru: "ID пользователя для разбана!",
						"es-ES": "El ID del usuario que quieres desbanear!"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "The reason for unbanning this user.",
					description_localizations: {
						fr: "La raison du bannissement de cet utilisateur",
						ja: "このユーザーのバン解除の理由。",
						ru: "Причина разбана этого пользователя.",
						"es-ES": "La razón para desbanear a este usuario."
					},

					required: false,

					permission: null
				}
			],

			aliases: ["delban", "removeban", "deban", "pardon"],

			permission: PermissionFlagsBits.BanMembers
		},
		{
			name: "unlock",

			description: "Give ability to speak of all users in this text!",
			description_localizations: {
				fr: "Donner la possibilité de parler de tous les utilisateurs dans ce texte",
				ja: "このテキスト内の全ユーザーに発言権限を付与！",
				ru: "Дать возможность говорить всем в этом текстовом канале!",
				"es-ES": "Dar capacidad de hablar a todos los usuarios en este texto!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "unmute",

			description: "Unmute a user!",
			description_localizations: {
				fr: "Demute un utilisateur !",
				ja: "ユーザーのミュートを解除！",
				ru: "Размутить пользователя!",
				"es-ES": "Desilenciar a un usuario!"
			},

			aliases: ["untempmute", "untimeout", "demute"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to unmuted",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez unmuted",
						ja: "ミュート解除したいユーザー",
						ru: "Пользователь для размута",
						"es-ES": "El usuario que quieres desilenciar"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unmuteall",

			description: "Unmute all muted members!",
			description_localizations: {
				fr: "Demute tous les membres mute textuellement",
				ja: "全ミュートメンバーのミュートを解除！",
				ru: "Размутить всех замученных участников!",
				"es-ES": "Desilenciar a todos los miembros silenciados!"
			},

			aliases: ["unmute-all", "untimeoutall", "untimeout-all", "demuteall"],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "warn",

			description: "warn a user",
			description_localizations: {
				fr: "avertir un utilisateur",
				ja: "ユーザーを警告",
				ru: "предупредить пользователя",
				"es-ES": "advertir a un usuario"
			},

			options: [
				{
					name: "member",

					description: "The member you want to warn",
					description_localizations: {
						fr: "le membre que vous voulez signaler",
						ja: "警告したいメンバー",
						ru: "Участник для предупреждения",
						"es-ES": "El miembro al que quieres advertir"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				},
				{
					name: "reason",

					description: "The reason why you want to warn this member",
					description_localizations: {
						fr: "La raison du warn",
						ja: "このメンバーを警告する理由",
						ru: "Причина предупреждения этого участника",
						"es-ES": "La razón por la que quieres advertir a este miembro"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unwarn",

			description: "unwarn a user",
			description_localizations: {
				fr: "supprimer un avertissement d'un utilisateur",
				ja: "ユーザーの警告を解除",
				ru: "снять предупреждение",
				"es-ES": "quitar advertencia"
			},

			options: [
				{
					name: "member",

					description: "The member you want to unwarn",
					description_localizations: {
						fr: "le membre que vous voulez enlever sont signalement",
						ja: "警告を解除したいメンバー",
						ru: "Участник для снятия предупреждения",
						"es-ES": "El miembro al que quieres quitar la advertencia"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				},
				{
					name: "warn-id",

					description: "The warn id",
					description_localizations: {
						fr: "l'identifiant du warn",
						ja: "警告ID",
						ru: "ID предупреждения",
						"es-ES": "El ID de la advertencia"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "warnlist",

			description: "show all warns of a user",
			description_localizations: {
				fr: "afficher tout les avertissement d'un utilisateur",
				ja: "ユーザーの全警告を表示",
				ru: "показать все предупреждения пользователя",
				"es-ES": "mostrar todas las advertencias de un usuario"
			},

			options: [
				{
					name: "member",

					description: "The member you want to lookup",
					description_localizations: {
						fr: "le membre que vous shouaiter vérifier",
						ja: "検索したいメンバー",
						ru: "Участник для поиска",
						"es-ES": "El miembro que quieres buscar"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				}
			],

			aliases: [
				"warns",
				"listwarns",
				"listwarn",
				"warnslist",
				"sanctions"
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "clearwarn",

			description: "clear all warns of a user",
			description_localizations: {
				fr: "effacer tout les avertissement d'un utilisateur",
				ja: "ユーザーの全警告をクリア",
				ru: "очистить все предупреждения пользователя",
				"es-ES": "limpiar todas las advertencias de un usuario"
			},

			options: [
				{
					name: "member",

					description: "The member you want to clear",
					description_localizations: {
						fr: "le membre que vous voulez effacer les avertissements",
						ja: "クリアしたいメンバー",
						ru: "Участник для очистки",
						"es-ES": "El miembro que quieres limpiar"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				}
			],

			aliases: [
				"clearwarns",
				"clearwarn",
				"clearsanctions",
				"clearsanction"
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "clear-all-warns",

			description: "clear all warns of all users across the server",
			description_localizations: {
				fr: "effacer tout les avertissement de tous les utilisateurs du serveur",
				ja: "サーバー全体の全ユーザーの警告をクリア",
				ru: "очистить все предупреждения всех пользователей",
				"es-ES": "limpiar todas las advertencias de todos los usuarios del servidor"
			},

			type: ApplicationCommandOptionType.Subcommand,

			aliases: [
				"clearallwarns",
				"clearallwarn",
				"clearsanctionsall",
				"clearsanctionall"
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "temprole",

			description: "Give a role temporary to a server member",
			description_localizations: {
				fr: "Donner un rôle temporairement à un membre de votre serveur discord",
				ja: "サーバーメンバーに一時的にロールを付与",
				ru: "Временно выдать роль участнику сервера",
				"es-ES": "Dar un rol temporal a un miembro del servidor"
			},

			options: [
				{
					name: "member",

					description: "The member you want to add the role",
					description_localizations: {
						fr: "Le membre qui recevras le rôle",
						ja: "ロールを追加したいメンバー",
						ru: "Участник, которому добавить роль",
						"es-ES": "El miembro al que quieres añadir el rol"
					},

					permission: null,
					type: ApplicationCommandOptionType.User,
					required: true
				},
				{
					name: "role",

					description: "The role you want to add to the member",
					description_localizations: {
						fr: "Le rôle que recevras le membre",
						ja: "メンバーに追加したいロール",
						ru: "Роль для добавления участнику",
						"es-ES": "El rol que quieres añadir al miembro"
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: true
				},
				{
					name: "time",

					description: "The time the member will keep the role",
					description_localizations: {
						fr: "Le temps que le membre auras ce rôle",
						ja: "メンバーがロールを保持する時間",
						ru: "Время, на которое участник получит роль",
						"es-ES": "El tiempo que el miembro mantendrá el rol"
					},

					permission: null,
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: "reason",

					description: "The reason why you added this role",
					description_localizations: {
						fr: "La raison de l'ajout du rôle",
						ja: "このロールを追加した理由",
						ru: "Причина добавления этой роли",
						"es-ES": "La razón por la que añadiste este rol"
					},

					permission: null,
					type: ApplicationCommandOptionType.String,
					required: false
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			aliases: ["addtemprole", "temporaryrole", "temproles"],
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "rolepanel",
			description: "Give selected roles to a member through a panel",
			description_localizations: {
				fr: "Donner des rôles sélectionnés à un membre via un panel",
				ja: "パネルを通じて選択したロールをメンバーに付与",
				ru: "Выдать выбранные роли участнику через панель",
				"es-ES": "Dar roles seleccionados a un miembro a través de un panel"
			},
			options: [
				{
					name: "member",
					description: "The member who will receive the roles",
					description_localizations: {
						fr: "Le membre qui recevra les rôles",
						ja: "ロールを受け取るメンバー",
						ru: "Участник, который получит роли",
						"es-ES": "El miembro que recibirá los roles"
					},
					permission: null,
					type: ApplicationCommandOptionType.User,
					required: false
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageRoles
		},
		{
			name: "tempban",
			description: "Temporarily ban a user from the server",
			description_localizations: {
				fr: "Bannir temporairement un utilisateur du serveur",
				ja: "ユーザーをサーバーから一時的にバン",
				ru: "Временно забанить пользователя на сервере",
				"es-ES": "Banear temporalmente a un usuario del servidor"
			},
			options: [
				{
					name: "user",
					description: "The user you want to temporarily ban",
					description_localizations: {
						fr: "L'utilisateur que vous voulez bannir temporairement",
						ja: "一時的にバンしたいユーザー",
						ru: "Пользователь для временного бана",
						"es-ES": "El usuario que quieres banear temporalmente"
					},
					permission: null,
					type: ApplicationCommandOptionType.User,
					required: true
				},
				{
					name: "duration",
					description: "The duration of the ban (e.g., 1h, 3d, 1w)",
					description_localizations: {
						fr: "La durée du bannissement (ex: 1h, 3j, 1s)",
						ja: "バン期間（例: 1h, 3d, 1w）",
						ru: "Длительность бана (напр., 1ч, 3д, 1н)",
						"es-ES": "La duración del baneo (ej., 1h, 3d, 1s)"
					},
					permission: null,
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: "reason",
					description: "The reason for the ban",
					description_localizations: {
						fr: "La raison du bannissement",
						ja: "バンの理由",
						ru: "Причина бана",
						"es-ES": "La razón del baneo"
					},
					permission: null,
					type: ApplicationCommandOptionType.String,
					required: false
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			aliases: ["tban", "temporaryban"],
			permission: PermissionFlagsBits.BanMembers
		}
	],
	thinking: true,
	category: "moderation",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

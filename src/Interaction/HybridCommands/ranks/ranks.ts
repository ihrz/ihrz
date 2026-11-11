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
	name: "ranks",

	description: "Subcommand for ranks category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de niveau (message)",
		ja: "ランクカテゴリのサブコマンド！",
		ru: "Подкоманда для категории рангов!",
		"es-ES": "Subcomando para la categoría de rangos!",
		ko: "랭크 하위 명령어!"
	},

	options: [
		{
			name: "roles",
			prefixName: "ranks-roles",

			description: "When user earn a ranks's level, give it a role!",
			description_localizations: {
				fr: "Lorsque l'utilisateur atteint un niveau de rang, attribuez-lui un rôle !",
				ja: "ユーザーがランクレベルを獲得したらロールを付与！",
				ru: "Когда пользователь получает уровень ранга, выдать роль!",
				"es-ES":
					"Cuando el usuario gana un nivel de rango, darle un rol!",
				ko: "사용자가 레벨에 도달하면 역할을 지급해요!"
			},

			aliases: ["rroles"],

			type: ApplicationCommandOptionType.Subcommand,
			thinking: true,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "config",
			prefixName: "rconfig",

			description:
				"Config the message when user earn new xp level message!",
			description_localizations: {
				fr: "Configurer le message lorsque l'utilisateur gagne un nouveau message de niveau XP",
				ja: "ユーザーが新しいXPレベルを獲得した時のメッセージを設定！",
				ru: "Настроить сообщение при получении нового уровня XP!",
				"es-ES":
					"Configurar el mensaje cuando el usuario gana un nuevo nivel de XP!",
				ko: "사용자가 새 레벨에 도달했을 때 보낼 메시지를 설정해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What you want to do?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?"
					},

					required: true,
					choices: [
						{
							name: "Power On the module (send message when user earn xp level)",
							name_localizations: {
								fr: "Activer le module (envoyer un message lorsque l'utilisateur gagne un niveau XP)",
								ja: "power_on_the_module_send_message",
								ru: "power_on_the_module_send_message",
								"es-ES": "power_on_the_module_send_message",
								ko: "모듈 켜기 (레벨이 오르면 메시지 전송)"
							},
							value: "on"
						},
						{
							name: "Power Off the module (don't send any message but user still earn xp level)",
							name_localizations: {
								fr: "Désactiver le module (ne pas envoyer de message mais l'utilisateur gagne toujours un niveau XP)",
								ja: "power_off_the_module_don_t_send_",
								ru: "power_off_the_module_don_t_send_",
								"es-ES": "power_off_the_module_don_t_send_",
								ko: "모듈 끄기 (메시지는 보내지 않지만 경험치(XP)는 계속 쌓여요)"
							},
							value: "off"
						},
						{
							name: "Disable the module (don't send any message and user don't earn xp level)",
							name_localizations: {
								fr: "Désactiver le module (ne pas envoyer de message et l'utilisateur ne gagne pas de niveau XP)",
								ja: "disable_the_module_don_t_send_an",
								ru: "disable_the_module_don_t_send_an",
								"es-ES": "disable_the_module_don_t_send_an",
								ko: "모듈 비활성화 (메시지를 보내지 않고 경험치(XP)도 쌓이지 않아요)"
							},
							value: "disable"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "show",
			prefixName: "ranks-show",

			name_localizations: {
				fr: "afficher",
				ja: "show",
				ru: "show",
				"es-ES": "show",
				ko: "show"
			},

			description: "Get the user's xp level!",
			description_localizations: {
				fr: "Obtenez le niveau XP de l'utilisateur",
				ja: "ユーザーのXPレベルを取得！",
				ru: "Получить уровень XP пользователя!",
				"es-ES": "Obtener el nivel de XP del usuario!",
				ko: "사용자의 레벨을 확인해요!"
			},

			aliases: ["rsee", "look", "level"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description:
						"The user you want to lookup, keep blank if you want to show your stats",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez rechercher.",
						ja: "検索したいユーザー（空白で自分の統計を表示）",
						ru: "Пользователь для поиска, оставьте пустым для показа своей статистики",
						"es-ES":
							"El usuario que quieres buscar, déjalo en blanco si quieres mostrar tus estadísticas",
						ko: "조회할 사용자 (비워 두면 내 통계)"
					},

					required: false,

					permission: null
				}
			],

			thinking: true,
			permission: null
		},
		{
			name: "ureset",
			prefixName: "ranks-ureset",

			description: "Reset the ranks level of an user",
			description_localizations: {
				fr: "Supprimer les données de rang d'un utilisateur",
				ja: "ユーザーのランクレベルをリセット",
				ru: "Сбросить уровень ранга пользователя",
				"es-ES": "Restablecer el nivel de rango de un usuario",
				ko: "사용자의 레벨을 초기화해요"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to reset the ranks data",
					description_localizations: {
						fr: "L'utilisateur que vous voulez supprimer du module de rangs.",
						ja: "ランクデータをリセットしたいユーザー",
						ru: "Пользователь, чьи данные рангов нужно сбросить",
						"es-ES":
							"El usuario al que quieres restablecer los datos de rango",
						ko: "랭크 데이터를 초기화할 사용자"
					},

					required: true,
					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "greset",
			prefixName: "ranks-greset",

			description: "Reset the ranks level of every user in the guild",
			description_localizations: {
				fr: "Supprimer les données de rang de tout les utilisateur",
				ja: "サーバー内の全ユーザーのランクレベルをリセット",
				ru: "Сбросить уровень ранга всех пользователей",
				"es-ES":
					"Restablecer el nivel de rango de cada usuario en el servidor",
				ko: "서버 모든 사용자의 레벨을 초기화해요"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "channel",
			prefixName: "ranks-channel",

			name_localizations: {
				fr: "définir-cannal",
				ja: "channel",
				ru: "channel",
				"es-ES": "channel",
				ko: "channel"
			},

			description:
				"Set the channel where user earn new xp level message!",
			description_localizations: {
				fr: "Définir le canal sur lequel l'utilisateur gagne un nouveau message de niveau XP",
				ja: "ユーザーが新しいXPレベルメッセージを獲得するチャンネルを設定！",
				ru: "Установить канал для сообщений о новом уровне XP!",
				"es-ES":
					"Establecer el canal donde el usuario recibe el mensaje de nuevo nivel de XP!",
				ko: "레벨 업 메시지를 보낼 채널을 설정해요!"
			},

			aliases: ["rchannel"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What you want to do?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?"
					},

					required: true,
					choices: [
						{
							name: "Remove the module (send xp message on the user's message channel)",
							name_localizations: {
								fr: "Supprimer le module (envoyer un message XP sur le canal du message de l'utilisateur)",
								ja: "remove_the_module_send_xp_messag",
								ru: "remove_the_module_send_xp_messag",
								"es-ES": "remove_the_module_send_xp_messag",
								ko: "모듈 제거 (사용자가 메시지를 보낸 채널에 레벨업 메시지 전송)"
							},
							value: "off"
						},
						{
							name: "Power on the module (send xp message on a specific channel)",
							name_localizations: {
								fr: "Activer le module (envoyer un message XP sur un canal spécifique)",
								ja: "power_on_the_module_send_xp_mess",
								ru: "power_on_the_module_send_xp_mess",
								"es-ES": "power_on_the_module_send_xp_mess",
								ko: "모듈 켜기 (특정 채널에 레벨업 메시지 전송)"
							},
							value: "on"
						}
					],

					permission: null
				},
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,

					description: "The specific channel for xp message !",
					description_localizations: {
						fr: "Le canal spécifique pour le message XP",
						ja: "XPメッセージ用の特定チャンネル！",
						ru: "Конкретный канал для сообщений XP!",
						"es-ES": "El canal específico para mensajes de XP!",
						ko: "경험치(XP) 메시지를 보낼 채널!"
					},

					channel_types: [ChannelType.GuildText],

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "leaderboard",
			prefixName: "ranks-leaderboard",

			name_localizations: {
				fr: "classement",
				ja: "leaderboard",
				ru: "leaderboard",
				"es-ES": "leaderboard",
				ko: "leaderboard"
			},

			description: "Get the xp's leaderboard of the guild!",
			description_localizations: {
				fr: "Obtenez le classement XP du serveur",
				ja: "サーバーのXPランキングを取得！",
				ru: "Получить таблицу лидеров по XP!",
				"es-ES":
					"Obtener la tabla de clasificación de XP del servidor!",
				ko: "서버의 경험치(XP) 순위표를 확인해요!"
			},

			aliases: ["rankslb"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "ignore-channels",
			prefixName: "ranks-ignore-channels",

			description: "Ignore this channels in the Ranks Module",
			description_localizations: {
				fr: "Ignorer des salons afin que le module de Rangs ne l'ai prennent pas en compte",
				ja: "ランクモジュールでこのチャンネルを無視",
				ru: "Игнорировать эти каналы в модуле рангов",
				"es-ES": "Ignorar estos canales en el módulo de Rangos",
				ko: "랭크 모듈에서 무시할 채널"
			},

			aliases: ["ignore"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "message",
			prefixName: "ranks-message",

			description: "Set a custom message when user earn level",
			description_localizations: {
				fr: "Définir un message personalisé quand un membre gagne un niveaus",
				ja: "ユーザーがレベルアップした時のカスタムメッセージを設定",
				ru: "Установить сообщение при повышении уровня",
				"es-ES":
					"Establecer un mensaje personalizado cuando el usuario gana nivel",
				ko: "레벨이 오를 때 보낼 맞춤 메시지를 설정해요"
			},

			aliases: ["msg"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "ranks",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

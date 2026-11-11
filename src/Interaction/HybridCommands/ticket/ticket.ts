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
	name: "ticket",

	description: "Subcommand for ticket category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de ticket",
		ja: "チケットカテゴリのサブコマンド！",
		ru: "Подкоманда для категории тикетов!",
		"es-ES": "Subcomando para la categoría de tickets!",
		ko: "티켓 하위 명령어!"
	},

	options: [
		{
			name: "add-member",

			description: "Add a member into your ticket!",
			description_localizations: {
				fr: "Ajoutez un membre dans votre ticket",
				ja: "チケットにメンバーを追加！",
				ru: "Добавить участника в тикет!",
				"es-ES": "Añadir un miembro a tu ticket!",
				ko: "티켓에 멤버를 추가해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to add into your ticket",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez ajouter à votre ticket",
						ja: "チケットに追加したいユーザー",
						ru: "Пользователь, которого вы хотите добавить в тикет",
						"es-ES": "El usuario que quieres añadir a tu ticket",
						ko: "티켓에 추가할 사용자"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "close",

			description: "Close a ticket!",
			description_localizations: {
				fr: "Fermer un ticket",
				ja: "チケットを閉じる！",
				ru: "Закрыть тикет!",
				"es-ES": "Cerrar un ticket!",
				ko: "티켓을 닫아요!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "rename",

			description: "Rename a ticket!",
			description_localizations: {
				fr: "Rénommer un ticket",
				ja: "チケットの名前を変更！",
				ru: "Переименовать тикет!",
				"es-ES": "Renombrar un ticket!",
				ko: "티켓 이름을 바꿔요!"
			},

			options: [
				{
					name: "name",

					description: "The new name of the ticket channel.",
					description_localizations: {
						fr: "Le nouveau nom du canal de ticket",
						ja: "チケットチャンネルの新しい名前。",
						ru: "Новое название канала тикета.",
						"es-ES": "El nuevo nombre del canal de ticket.",
						ko: "티켓 채널의 새 이름"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "remind",

			description:
				"Remind the ticket owner that they not have responded since while !",
			description_localizations: {
				fr: "Rappelez au propriétaire du ticket qu'il n'a pas répondu depuis un certain temps !",
				ja: "チケット所有者がしばらく応答していないことを通知！",
				ru: "Напомнить владельцу тикета, что он давно не отвечал!",
				"es-ES":
					"Recordar al propietario del ticket que no ha respondido desde hace tiempo!",
				ko: "한동안 응답하지 않은 티켓 작성자에게 알림을 보내요!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: [PermissionFlagsBits.ManageChannels]
		},
		{
			name: "delete",
			prefixName: "ticket-delete",

			description: "Delete a iHorizon ticket!",
			description_localizations: {
				fr: "Supprimer un ticket",
				ja: "iHorizonチケットを削除！",
				ru: "Удалить тикет iHorizon!",
				"es-ES": "Eliminar un ticket de iHorizon!",
				ko: "iHorizon 티켓을 삭제해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			aliases: ["tdelete"],

			permission: null
		},
		{
			name: "config",
			prefixName: "ticket-config",

			description: "Disable ticket commands on a guild!",
			description_localizations: {
				fr: "Désactiver les commande de ticket au seins du serveur",
				ja: "サーバーでチケットコマンドを無効化！",
				ru: "Отключить команды тикетов на сервере!",
				"es-ES": "Deshabilitar los comandos de ticket en un servidor!",
				ko: "서버에서 티켓 명령어를 비활성화해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What you want to do ?",
					description_localizations: {
						fr: "Que veux-tu faire? ",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?"
					},

					required: true,
					choices: [
						{
							name: "Remove the module",
							name_localizations: {
								fr: "Supprimer le module",
								ja: "remove_the_module",
								ru: "remove_the_module",
								"es-ES": "remove_the_module",
								ko: "모듈 제거"
							},
							value: "off"
						},
						{
							name: "Power on the module",
							name_localizations: {
								fr: "Activer le module",
								ja: "power_on_the_module",
								ru: "power_on_the_module",
								"es-ES": "power_on_the_module",
								ko: "모듈 켜기"
							},
							value: "on"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "log-channel",

			description:
				"Set a channel where iHorizon sent a logs about tickets!",
			description_localizations: {
				fr: "Définir un canal sur lequel iHorizon a envoyé des journaux sur les tickets",
				ja: "iHorizonがチケットに関するログを送信するチャンネルを設定！",
				ru: "Установить канал для логов iHorizon о тикетах!",
				"es-ES":
					"Establecer un canal donde iHorizon envíe registros sobre tickets!",
				ko: "iHorizon이 티켓 로그를 보낼 채널을 설정해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					description: "Where you want the logs",
					description_localizations: {
						fr: "Où voulez-vous les journaux ?",
						ja: "ログを送信する場所",
						ru: "Куда вы хотите отправлять логи",
						"es-ES": "Donde quieres los registros",
						ko: "로그를 보낼 위치"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "open",

			description: "re-open a closed ticket!",
			description_localizations: {
				fr: "Re-ouvrir un ticket fermet",
				ja: "閉じたチケットを再オープン！",
				ru: "переоткрыть закрытый тикет!",
				"es-ES": "reabrir un ticket cerrado!",
				ko: "닫힌 티켓을 다시 열어요!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "remove-member",

			description: "Remove a member from your ticket!",
			description_localizations: {
				fr: "Enlever un membre d'un ticket",
				ja: "チケットからメンバーを削除！",
				ru: "Удалить участника из тикета!",
				"es-ES": "Eliminar a un miembro de tu ticket!",
				ko: "티켓에서 멤버를 제거해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to remove into your ticket",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez supprimer de votre ticket",
						ja: "チケットから削除したいユーザー",
						ru: "Пользователь, которого вы хотите удалить из тикета",
						"es-ES": "El usuario que quieres eliminar de tu ticket",
						ko: "티켓에서 제거할 사용자"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "panel",

			description: "Making a panel for custom ticket configuration",
			description_localizations: {
				fr: "Créer un panel pour customiser le système de ticket",
				ja: "カスタムチケット設定用パネルを作成",
				ru: "Создание панели для настройки тикетов",
				"es-ES":
					"Crear un panel para configuración de tickets personalizada",
				ko: "맞춤 티켓 설정 패널을 만들어요"
			},

			options: [
				{
					name: "panel_id",

					description: "ID of your panel",
					description_localizations: {
						fr: "L'identifiant du panel",
						ja: "パネルのID",
						ru: "ID вашей панели",
						"es-ES": "ID de tu panel",
						ko: "패널 ID"
					},

					required: false,
					type: ApplicationCommandOptionType.String,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "set-category",

			description: "Set the category where ticket are create!",
			description_localizations: {
				fr: "Définir la catégorie dans laquelle les ticket doivent être créés",
				ja: "チケットが作成されるカテゴリを設定！",
				ru: "Установить категорию для создания тикетов!",
				"es-ES": "Establecer la categoría donde se crean los tickets!",
				ko: "티켓이 생성될 카테고리를 설정해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "category-name",

					description: "The name of you ticket's panel.",
					description_localizations: {
						fr: "Le nom du panneau de votre ticket",
						ja: "チケットパネルの名前。",
						ru: "Название вашей панели тикетов.",
						"es-ES": "El nombre de tu panel de tickets.",
						ko: "티켓 패널 이름"
					},

					channel_types: [ChannelType.GuildCategory],

					type: ApplicationCommandOptionType.Channel,
					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "transcript",

			description: "Get the transript of a ticket message!",
			description_localizations: {
				fr: "Obtenir la transcription d'un message de ticket",
				ja: "チケットメッセージのトランスクリプトを取得！",
				ru: "Получить транскрипт тикета!",
				"es-ES": "Obtener la transcripción de un mensaje de ticket!",
				ko: "티켓 대화 기록을 받아요!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "unlink",

			description: "Unlink a ticket!",
			description_localizations: {
				fr: "Transforme le salon de ticket en salon classique auprès du bot.",
				ja: "チケットのリンクを解除！",
				ru: "Отвязать тикет!",
				"es-ES": "Desvincular un ticket!",
				ko: "티켓 연결을 해제해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		}
	],
	thinking: true,
	category: "ticket",
	type: ApplicationCommandType.ChatInput,

	permission: null
};

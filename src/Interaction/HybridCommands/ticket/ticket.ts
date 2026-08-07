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
		"es-ES": "Subcomando para la categoría de tickets!"
	},

	options: [
		{
			name: "add-member",

			description: "Add a member into your ticket!",
			description_localizations: {
				fr: "Ajoutez un membre dans votre ticket",
				ja: "チケットにメンバーを追加！",
				ru: "Добавить участника в тикет!",
				"es-ES": "Añadir un miembro a tu ticket!"
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
						"es-ES": "El usuario que quieres añadir a tu ticket"
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
				"es-ES": "Cerrar un ticket!"
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
				"es-ES": "Renombrar un ticket!"
			},

			options: [
				{
					name: "name",

					description: "The new name of the ticket channel.",
					description_localizations: {
						fr: "Le nouveau nom du canal de ticket",
						ja: "チケットチャンネルの新しい名前。",
						ru: "Новое название канала тикета.",
						"es-ES": "El nuevo nombre del canal de ticket."
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
				"es-ES": "Recordar al propietario del ticket que no ha respondido desde hace tiempo!"
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
				"es-ES": "Eliminar un ticket de iHorizon!"
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
				"es-ES": "Deshabilitar los comandos de ticket en un servidor!"
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
						"es-ES": "Que quieres hacer?"
					},

					required: true,
					choices: [
						{
							name: "Remove the module",
							name_localizations: {
								fr: "Supprimer le module",
								ja: "remove_the_module",
								ru: "remove_the_module",
								"es-ES": "remove_the_module"
							},
							value: "off"
						},
						{
							name: "Power on the module",
							name_localizations: {
								fr: "Activer le module",
								ja: "power_on_the_module",
								ru: "power_on_the_module",
								"es-ES": "power_on_the_module"
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
				"es-ES": "Establecer un canal donde iHorizon envíe registros sobre tickets!"
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
						"es-ES": "Donde quieres los registros"
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
				"es-ES": "reabrir un ticket cerrado!"
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
				"es-ES": "Eliminar a un miembro de tu ticket!"
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
						"es-ES": "El usuario que quieres eliminar de tu ticket"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "set-here",

			description:
				"Make a embed for allowing to user to create a ticket!",
			description_localizations: {
				fr: "Créer un embed pour permettre à l'utilisateur de créer un ticket",
				ja: "ユーザーがチケットを作成できるようにする埋め込みを作成！",
				ru: "Создать эмбед для возможности создания тикетов!",
				"es-ES": "Crear un embed para permitir al usuario crear un ticket!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "name",

					description: "The name of you ticket's panel.",
					description_localizations: {
						fr: "Le nom du panneau de votre ticket",
						ja: "チケットパネルの名前。",
						ru: "Название вашей панели тикетов.",
						"es-ES": "El nombre de tu panel de tickets."
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "description",

					description: "The description of you ticket's panel.",
					description_localizations: {
						fr: "La description du panneau de votre ticket",
						ja: "チケットパネルの説明。",
						ru: "Описание вашей панели тикетов.",
						"es-ES": "La descripción de tu panel de tickets."
					},

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				},
				{
					name: "category",

					description: "The category for the ticket.",
					description_localizations: {
						fr: "La catégorie pour les ticket",
						ja: "チケットのカテゴリ。",
						ru: "Категория для тикета.",
						"es-ES": "La categoría para el ticket."
					},

					channel_types: [ChannelType.GuildCategory],

					type: ApplicationCommandOptionType.Channel,
					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "panel",

			description: "Making a panel for custom ticket configuration",
			description_localizations: {
				fr: "Créer un panel pour customiser le système de ticket",
				ja: "カスタムチケット設定用パネルを作成",
				ru: "Создание панели для настройки тикетов",
				"es-ES": "Crear un panel para configuración de tickets personalizada"
			},

			options: [
				{
					name: "panel_id",

					description: "ID of your panel",
					description_localizations: {
						fr: "L'identifiant du panel",
						ja: "パネルのID",
						ru: "ID вашей панели",
						"es-ES": "ID de tu panel"
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
				"es-ES": "Establecer la categoría donde se crean los tickets!"
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
						"es-ES": "El nombre de tu panel de tickets."
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
				"es-ES": "Obtener la transcripción de un mensaje de ticket!"
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
				"es-ES": "Desvincular un ticket!"
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

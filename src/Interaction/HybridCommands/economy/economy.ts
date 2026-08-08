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
	GuildMember,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

export const command: Command = {
	name: "economy",
	name_localizations: {
		fr: "économie",
		ja: "economy",
		ru: "economy",
		"es-ES": "economy"
	},

	description: "Subcommand for economy category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie d'économie",
		ja: "経済カテゴリのサブコマンド！",
		ru: "Подкоманда для категории экономики!",
		"es-ES": "Subcomando para la categoría de economía!"
	},

	options: [
		{
			name: "balance-add",
			prefixName: "addmoney",

			description: "Add money to a user!",
			description_localizations: {
				fr: "Ajoutez de l'argent à un utilisateur",
				ja: "ユーザーにお金を追加！",
				ru: "Добавить деньги пользователю!",
				"es-ES": "Añadir dinero a un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "The amount of money you want to add",
					description_localizations: {
						fr: "Le montant d'argent que vous souhaitez ajouter",
						ja: "追加したい金額",
						ru: "Сумма денег для добавления",
						"es-ES": "La cantidad de dinero que quieres añadir"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member who you want to add money",
					description_localizations: {
						fr: "Le membre à qui vous souhaitez ajouter de l'argent",
						ja: "お金を追加したいメンバー",
						ru: "Участник, которому добавить деньги",
						"es-ES": "El miembro al que quieres añadir dinero"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "balance-remove",
			prefixName: "removemoney",

			description: "Remove money from a user!",
			description_localizations: {
				fr: "Retirer de l'argent à un utilisateur",
				ja: "ユーザーからお金を削除！",
				ru: "Убрать деньги у пользователя!",
				"es-ES": "Quitar dinero a un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "amount of $ you want add",
					description_localizations: {
						fr: "montant de $ que vous souhaitez ajouter",
						ja: "追加したい金額",
						ru: "сумма для добавления",
						"es-ES": "cantidad de $ que quieres añadir"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to add the money",
					description_localizations: {
						fr: "le membre auquel vous souhaitez ajouter de l'argent",
						ja: "お金を追加したいメンバー",
						ru: "участник, которому добавить деньги",
						"es-ES": "el miembro al que quieres añadir dinero"
					},

					required: true,
					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "balance",

			description: "Get the balance of a user!",
			description_localizations: {
				fr: "Obtenir le solde d'un utilisateur",
				ja: "ユーザーの残高を取得！",
				ru: "Получить баланс пользователя!",
				"es-ES": "Obtener el saldo de un usuario!"
			},

			aliases: ["wallet", "coins", "bal"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description:
						"Target a user for see their current balance or keep blank for yourself",
					description_localizations: {
						fr: "Ciblez un utilisateur pour voir son solde actuel",
						ja: "残高を確認するユーザーを指定（空白で自分）",
						ru: "Укажите пользователя для просмотра баланса или оставьте пустым для себя",
						"es-ES": "Selecciona un usuario para ver su saldo actual o déjalo en blanco para ti"
					},

					required: false,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "config",
			prefixName: "ecconfig",

			description: "Disable the economy module into your guild",
			description_localizations: {
				fr: "Désactiver entièrement le module d'économie sur un serveur",
				ja: "サーバーの経済モジュールを無効化",
				ru: "Отключить экономический модуль на сервере",
				"es-ES": "Deshabilitar el módulo de economía en tu servidor"
			},

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?"
					},

					type: ApplicationCommandOptionType.String,

					choices: [
						{
							name: "Enable the module",
							name_localizations: {
								fr: "Activer",
								ja: "enable_the_module",
								ru: "enable_the_module",
								"es-ES": "enable_the_module"
							},
							value: "on"
						},
						{
							name: "Disable the module",
							name_localizations: {
								fr: "Désactiver",
								ja: "disable_the_module",
								ru: "disable_the_module",
								"es-ES": "disable_the_module"
							},
							value: "off"
						}
					],

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "leaderboard",
			prefixName: "economy-leaderboard",

			description: "Get the users balance's leaderboard of the guild!",
			description_localizations: {
				fr: "Obtenez le classement du solde des utilisateurs du serveur",
				ja: "サーバーのユーザー残高ランキングを取得！",
				ru: "Получить таблицу лидеров по балансу!",
				"es-ES": "Obtener la tabla de clasificación de saldos del servidor!"
			},

			aliases: ["eclb", "eco-lb", "economy-lb"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "deposit",

			description: "Deposit coin in your bank!",
			description_localizations: {
				fr: "Déposez des pièces dans votre banque",
				ja: "銀行にコインを預ける！",
				ru: "Положить монеты в банк!",
				"es-ES": "Depositar monedas en tu banco!"
			},

			aliases: ["dep"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "how-much",
					type: ApplicationCommandOptionType.String,

					description:
						"How much coin you want to deposit in your bank?",
					description_localizations: {
						fr: "Combien de pièces vous souhaitez déposer dans votre banque",
						ja: "銀行にいくら預けますか？",
						ru: "Сколько монет вы хотите положить в банк?",
						"es-ES": "Cuántas monedas quieres depositar en tu banco?"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "daily",

			description: "Claim a daily reward!",
			description_localizations: {
				fr: "Réclamez une récompense quotidienne",
				ja: "デイリー報酬を獲得！",
				ru: "Получить ежедневную награду!",
				"es-ES": "Reclamar una recompensa diaria!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "monthly",

			description: "Claim a monthly reward!",
			description_localizations: {
				fr: "Réclamez une récompense mensuelle",
				ja: "マンスリー報酬を獲得！",
				ru: "Получить ежемесячную награду!",
				"es-ES": "Reclamar una recompensa mensual!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "weekly",

			description: "Claim a weekly reward!",
			description_localizations: {
				fr: "Réclamez une récompense hebdomadaire",
				ja: "ウィークリー報酬を獲得！",
				ru: "Получить еженедельную награду!",
				"es-ES": "Reclamar una recompensa semanal!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "pay",

			description: "Pay a user a certain amount!",
			description_localizations: {
				fr: "Payer à un utilisateur un certain montant",
				ja: "ユーザーに特定の金額を支払う！",
				ru: "Заплатить пользователю определенную сумму!",
				"es-ES": "Pagar a un usuario una cierta cantidad!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description:
						"The amount of money you want to donate to them",
					description_localizations: {
						fr: "Le montant d’argent que vous souhaitez lui donner",
						ja: "寄付したい金額",
						ru: "Сумма денег, которую вы хотите пожертвовать",
						"es-ES": "La cantidad de dinero que quieres donarles"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member you want to donate the money",
					description_localizations: {
						fr: "Le membre à qui vous souhaitez donner de l'argent",
						ja: "お金を寄付したいメンバー",
						ru: "Участник, которому пожертвовать деньги",
						"es-ES": "El miembro al que quieres donar el dinero"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "rob",

			description: "Rob a user!",
			description_localizations: {
				fr: "Volé de l'argent d'un utilisateur",
				ja: "ユーザーから奪う！",
				ru: "Ограбить пользователя!",
				"es-ES": "Robar a un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to rob a money",
					description_localizations: {
						fr: "le membre à qui tu veux voler de l'argent",
						ja: "お金を奪いたいメンバー",
						ru: "участник, у которого вы хотите украсть деньги",
						"es-ES": "el miembro al que quieres robar dinero"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "withdraw",

			description: "Withdraw coin from your bank!",
			description_localizations: {
				fr: "Retirer des pièces de votre banque",
				ja: "銀行からコインを引き出す！",
				ru: "Снять монеты из банка!",
				"es-ES": "Retirar monedas de tu banco!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "how-much",
					type: ApplicationCommandOptionType.String,

					description:
						"How much coin you want to withdraw from your bank?",
					description_localizations: {
						fr: "Combien de pièces vous souhaitez retirer de votre banque",
						ja: "銀行からいくら引き出しますか？",
						ru: "Сколько монет вы хотите снять из банка?",
						"es-ES": "Cuántas monedas quieres retirar de tu banco?"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "work",

			description: "Claim a work reward!",
			description_localizations: {
				fr: "Réclamez une récompense de travail",
				ja: "仕事の報酬を獲得！",
				ru: "Получить награду за работу!",
				"es-ES": "Reclamar una recompensa de trabajo!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "role",
			prefixName: "ecrole",

			description: "Set a role for a certain amount of money!",
			description_localizations: {
				fr: "Définir un rôle pour un certain montant d'argent",
				ja: "特定の金額でロールを設定！",
				ru: "Установить роль за определенную сумму!",
				"es-ES": "Establecer un rol por una cierta cantidad de dinero!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: "add",
					prefixName: "economy-role-add",

					description: "Add a role for a certain amount of money!",
					description_localizations: {
						fr: "Ajouter un rôle pour un certain montant d'argent",
						ja: "特定の金額でロールを追加！",
						ru: "Добавить роль за определенную сумму!",
						"es-ES": "Añadir un rol por una cierta cantidad de dinero!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "role",
							type: ApplicationCommandOptionType.Role,

							description: "The role you want to add",
							description_localizations: {
								fr: "Le rôle que vous souhaitez ajouter",
								ja: "追加したいロール",
								ru: "Роль, которую вы хотите добавить",
								"es-ES": "El rol que quieres añadir"
							},

							required: true,

							permission: null
						},
						{
							name: "amount",
							type: ApplicationCommandOptionType.Number,

							description: "The amount of money you want to add",
							description_localizations: {
								fr: "Le montant d'argent que vous souhaitez ajouter",
								ja: "追加したい金額",
								ru: "Сумма денег для добавления",
								"es-ES": "La cantidad de dinero que quieres añadir"
							},

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "delete",
					prefixName: "economy-role-delete",

					description: "Delete a role for a certain amount of money!",
					description_localizations: {
						fr: "Supprimer un rôle pour un certain montant d'argent",
						ja: "特定の金額でロールを削除！",
						ru: "Удалить роль за определенную сумму!",
						"es-ES": "Eliminar un rol por una cierta cantidad de dinero!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "role",
							type: ApplicationCommandOptionType.Role,

							description: "The role you want to delete",
							description_localizations: {
								fr: "Le rôle que vous souhaitez supprimer",
								ja: "削除したいロール",
								ru: "Роль, которую вы хотите удалить",
								"es-ES": "El rol que quieres eliminar"
							},

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "list",
					prefixName: "economy-role-list",

					description: "List all roles that you can buy!",
					description_localizations: {
						fr: "Liste de tous les rôles que vous pouvez acheter",
						ja: "購入可能な全ロールを一覧表示！",
						ru: "Показать все роли, которые можно купить!",
						"es-ES": "Listar todos los roles que puedes comprar!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "boost-set",
			prefixName: "economy-boost-set",

			description: "Set a money boost for a certain role!",
			description_localizations: {
				fr: "Définir un boost d'argent pour un certain rôle",
				ja: "特定のロールにマネーブーストを設定！",
				ru: "Установить денежный бонус для роли!",
				"es-ES": "Establecer un impulso de dinero para un cierto rol!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "The role you want to modify the boost",
					description_localizations: {
						fr: "Le rôle que vous souhaitez modifier le boost",
						ja: "ブーストを変更したいロール",
						ru: "Роль, для которой изменить бонус",
						"es-ES": "El rol para el que quieres modificar el impulso"
					},

					required: true,

					permission: null
				},
				{
					name: "boost",
					type: ApplicationCommandOptionType.String,

					description: "The boost you want to add",
					description_localizations: {
						fr: "Le boost que vous souhaitez ajouter",
						ja: "追加したいブースト",
						ru: "Бонус, который вы хотите добавить",
						"es-ES": "El impulso que quieres añadir"
					},

					choices: [
						{
							name: "Default",
							name_localizations: {
								fr: "Défaut",
								ja: "default",
								ru: "default",
								"es-ES": "default"
							},
							value: "1"
						},
						{
							name: "x2",
							name_localizations: {
								fr: "x2",
								ja: "x2",
								ru: "x2",
								"es-ES": "x2"
							},
							value: "2"
						},
						{
							name: "x3",
							name_localizations: {
								fr: "x3",
								ja: "x3",
								ru: "x3",
								"es-ES": "x3"
							},
							value: "3"
						},
						{
							name: "x4",
							name_localizations: {
								fr: "x4",
								ja: "x4",
								ru: "x4",
								"es-ES": "x4"
							},
							value: "4"
						},
						{
							name: "x5",
							name_localizations: {
								fr: "x5",
								ja: "x5",
								ru: "x5",
								"es-ES": "x5"
							},
							value: "5"
						}
					],

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "manage-rewards",

			description:
				"Manage how much money you can get from daily, weekly and monthly!",
			description_localizations: {
				fr: "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement",
				ja: "デイリー、ウィークリー、マンスリーで獲得できる金額を管理！",
				ru: "Управлять количеством денег, получаемых ежедневно, еженедельно и ежемесячно!",
				"es-ES": "Gestionar cuánto dinero puedes obtener de diario, semanal y mensual!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,
			options: [
				{
					name: "set-money",
					description:
						"Manage how much money you can get from daily, weekly and monthly!",
					description_localizations: {
						fr: "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement",
						ja: "デイリー、ウィークリー、マンスリーで獲得できる金額を管理！",
						ru: "Управлять количеством денег, получаемых ежедневно, еженедельно и ежемесячно!",
						"es-ES": "Gestionar cuánto dinero puedes obtener de diario, semanal y mensual!"
					},
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "type",
							type: ApplicationCommandOptionType.String,
							description: "The type of reward you want to set",
							description_localizations: {
								fr: "Le type de récompense que vous souhaitez définir",
								ja: "設定したい報酬の種類",
								ru: "Тип награды, которую вы хотите установить",
								"es-ES": "El tipo de recompensa que quieres establecer"
							},
							choices: [
								{
									name: "Daily",
									name_localizations: {
										fr: "Quotidien",
										ja: "daily",
										ru: "daily",
										"es-ES": "daily"
									},
									value: "daily"
								},
								{
									name: "Weekly",
									name_localizations: {
										fr: "Hebdomadaire",
										ja: "weekly",
										ru: "weekly",
										"es-ES": "weekly"
									},
									value: "weekly"
								},
								{
									name: "Monthly",
									name_localizations: {
										fr: "Mensuel",
										ja: "monthly",
										ru: "monthly",
										"es-ES": "monthly"
									},
									value: "monthly"
								}
							],
							required: true,

							permission: null
						},
						{
							name: "how-much",
							type: ApplicationCommandOptionType.Number,
							description: "How much money you want to set",
							description_localizations: {
								fr: "Combien d'argent vous souhaitez définir",
								ja: "設定したい金額",
								ru: "Сколько денег вы хотите установить",
								"es-ES": "Cuánto dinero quieres establecer"
							},
							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "set-cooldown",
					description: "Manage the cooldown of the actions!",
					description_localizations: {
						fr: "Gérer le temps de recharge des actions",
						ja: "アクションのクールダウンを管理！",
						ru: "Управление задержкой действий!",
						"es-ES": "Gestionar el enfriamiento de las acciones!"
					},
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "type",
							type: ApplicationCommandOptionType.String,
							description:
								"Les actions que vous souhaitez définir",
							description_localizations: {
								fr: "Les actions que vous souhaitez définir",
								ja: "設定したいアクション",
								ru: "Действия, которые вы хотите определить",
								"es-ES": "Las acciones que deseas definir"
							},
							choices: [
								{
									name: "Rob",
									name_localizations: {
										fr: "Voler",
										ja: "rob",
										ru: "rob",
										"es-ES": "rob"
									},
									value: "rob"
								},
								{
									name: "Work",
									name_localizations: {
										fr: "Travailler",
										ja: "work",
										ru: "work",
										"es-ES": "work"
									},
									value: "work"
								}
							],
							required: true,
							permission: null
						},
						{
							name: "time",
							type: ApplicationCommandOptionType.String,
							description: "The time you want to set",
							description_localizations: {
								fr: "Le temps que vous souhaitez définir",
								ja: "設定したい時間",
								ru: "Время, которое вы хотите установить",
								"es-ES": "El tiempo que quieres establecer"
							},
							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				}
			],

			permission: null
		},
		{
			name: "shop",
			prefixName: "shop",

			description: "Get the shop of the guild!",
			description_localizations: {
				fr: "Obtenez le magasin du serveur",
				ja: "サーバーのショップを取得！",
				ru: "Получить магазин сервера!",
				"es-ES": "Obtener la tienda del servidor!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "ureset",
			prefixName: "economy-ureset",

			description: "Reset the balance of an user",
			description_localizations: {
				fr: "Supprimer les données économique d'un utilisateur",
				ja: "ユーザーの残高をリセット",
				ru: "Сбросить баланс пользователя",
				"es-ES": "Restablecer el saldo de un usuario"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to reset the economy data",
					description_localizations: {
						fr: "L'utilisateur que vous voulez supprimer du module d'économie.",
						ja: "経済データをリセットしたいユーザー",
						ru: "Пользователь, чьи экономические данные нужно сбросить",
						"es-ES": "El usuario al que quieres restablecer los datos de economía"
					},

					required: true,
					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "greset",
			prefixName: "economy-greset",

			description: "Reset the economy balance of every user in the guild",
			description_localizations: {
				fr: "Supprimer les données économique de tout les utilisateur",
				ja: "サーバー内の全ユーザーの経済残高をリセット",
				ru: "Сбросить баланс всех пользователей на сервере",
				"es-ES": "Restablecer el saldo de economía de todos los usuarios del servidor"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "economy",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

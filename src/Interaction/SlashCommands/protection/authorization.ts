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

export const rules = [
	{
		placeholder: "Delete All Settings",
		value: "cls"
	},
	{
		placeholder: "Select All Rules",
		value: "all"
	},
	{
		placeholder: "Create Webhook",
		value: "webhook"
	},
	{
		placeholder: "Edit Guild",
		value: "updateguild"
	},
	{
		placeholder: "Create Channel",
		value: "createchannel"
	},
	{
		placeholder: "Update Channel",
		value: "updatechannel"
	},
	{
		placeholder: "Delete Channel",
		value: "deletechannel"
	},
	{
		placeholder: "Create Role",
		value: "createrole"
	},
	{
		placeholder: "Delete Role",
		value: "deleterole"
	},
	{
		placeholder: "Update Role",
		value: "updaterole"
	},
	{
		placeholder: "Add/Remove Member Role(s)",
		value: "updatemember"
	},
	{
		placeholder: "Ban Members",
		value: "banmembers"
	},
	{
		placeholder: "Kick Members",
		value: "kickmember"
	},
	{
		placeholder: "Unban Members",
		value: "unbanmembers"
	},
	{
		placeholder: "Add admin role",
		value: "add_admin_roles"
	}
] as const;

export const command: Command = {
	name: "protect",

	description: "Subcommand for protection category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de protection",
		ja: "保護カテゴリのサブコマンド！",
		ru: "Подкоманда для категории защиты!",
		"es-ES": "Subcomando para la categoría de protección!"
	},

	options: [
		{
			name: "actions",

			description: "Choose an actions to Deny/Allow for the user!",
			description_localizations: {
				fr: "Choisissez une action à refuser/autoriser pour l'utilisateur",
				ja: "ユーザーに対して拒否/許可するアクションを選択！",
				ru: "Выберите действия для запрета/разрешения пользователю!",
				"es-ES": "Elegir acciones para Denegar/Permitir al usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "rule",
					type: ApplicationCommandOptionType.String,

					description: "Whats is the rule to configure?",
					description_localizations: {
						fr: "Quelle est la règle à configurer ?",
						ja: "設定するルールは？",
						ru: "Какое правило настроить?",
						"es-ES": "Cual es la regla a configurar?"
					},

					required: true,
					choices: Object.entries(rules).map(([key, value]) => ({
						name: value.placeholder,
						name_localizations: { fr: value.placeholder, ja: value.placeholder, ru: value.placeholder, "es-ES": value.placeholder },
						value: value.value
					})),

					permission: null
				},
				{
					name: "allow",
					type: ApplicationCommandOptionType.String,

					description: "The rule are bypassable for who?",
					description_localizations: {
						fr: "Les règles sont contournables pour qui ?",
						ja: "ルールをバイパスできるのは誰？",
						ru: "Для кого правила обходятся?",
						"es-ES": "Las reglas son evitables para quién?"
					},

					required: false,
					choices: [
						{
							name: "Only the allowlist",
							name_localizations: {
								fr: "Seulement la liste d'autorisation",
								ja: "only_the_allowlist",
								ru: "only_the_allowlist",
								"es-ES": "only_the_allowlist"
							},
							value: "allowlist"
						},
						{
							name: "All of member",
							name_localizations: {
								fr: "Tous les membres",
								ja: "all_of_member",
								ru: "all_of_member",
								"es-ES": "all_of_member"
							},
							value: "member"
						},
						{
							name: "Nobody (except guild owner)",
							name_localizations: {
								fr: "Personne (sauf le propriétaire du serveur)",
								ja: "nobody_except_guild_owner",
								ru: "nobody_except_guild_owner",
								"es-ES": "nobody_except_guild_owner"
							},
							value: "nobody"
						}
					],

					permission: PermissionFlagsBits.Administrator
				}
			],

			permission: null
		},
		{
			name: "sanction",

			description: "Choose the sanction to applied for the flagged user!",
			description_localizations: {
				fr: "Choisissez la sanction à appliquer pour l'utilisateur signalé?",
				ja: "フラグされたユーザーに適用する制裁を選択！",
				ru: "Выберите санкцию для отмеченного пользователя!",
				"es-ES": "Elegir la sanción a aplicar para el usuario marcado!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "choose",
					type: ApplicationCommandOptionType.String,

					description: "Whats is the sanction then?",
					description_localizations: {
						fr: "Quelle est donc la sanction ?",
						ja: "どの制裁ですか？",
						ru: "Какая санкция?",
						"es-ES": "Cual es la sanción entonces?"
					},

					required: true,
					choices: [
						{
							name: "Simply Cancel Actions",
							name_localizations: {
								fr: "Simplemente annuler les actions",
								ja: "simply_cancel_actions",
								ru: "simply_cancel_actions",
								"es-ES": "simply_cancel_actions"
							},
							value: "simply"
						},
						{
							name: "Simply Cancel Actions + Derank",
							name_localizations: {
								fr: "Simplemente annuler les actions + déséléver",
								ja: "simply_cancel_actions_derank",
								ru: "simply_cancel_actions_derank",
								"es-ES": "simply_cancel_actions_derank"
							},
							value: "simply+derank"
						},
						{
							name: "Simply Cancel Actions + Ban",
							name_localizations: {
								fr: "Simplemente annuler les actions + bannir",
								ja: "simply_cancel_actions_ban",
								ru: "simply_cancel_actions_ban",
								"es-ES": "simply_cancel_actions_ban"
							},
							value: "simply+ban"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "show",

			description:
				"Show the current configuration about protection authorization/rule & allow list!",
			description_localizations: {
				fr: "Afficher la configuration des autorisations/règles de protection pour la liste d'autorisation",
				ja: "保護認証/ルールと許可リストの現在の設定を表示！",
				ru: "Показать текущую конфигурацию авторизации/правил и белого списка!",
				"es-ES": "Mostrar la configuración actual sobre autorización/reglas de protección y lista de permitidos!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: true,
	category: "protection",
	type: ApplicationCommandType.ChatInput,

	permission: null
};

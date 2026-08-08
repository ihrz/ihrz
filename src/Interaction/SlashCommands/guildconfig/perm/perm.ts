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

import { Command } from "../../../../../types/command.js";
import { Option } from "../../../../../types/option.js";

export const permissionsRole = [
	"Perm 1",
	"Perm 2",
	"Perm 3",
	"Perm 4",
	"Perm 5",
	"Perm 6",
	"Perm 7",
	"Perm 8",
	"Perm 9"
];
export const permissionLevel = [
	{
		name: "Default",
		name_localizations: {
			fr: "Défaut",
			ja: "default",
			ru: "default",
			"es-ES": "default"
		},
		value: "0"
	},
	...permissionsRole.map((x) => {
		return {
			name: x,
			name_localizations: { fr: x, ja: x, ru: x, "es-ES": x },
			value: x.split(" ")[1]
		};
	})
];

export const command: Command = {
	name: "perm",

	description: "Subcommand for command permission!",
	description_localizations: {
		fr: "Commande sous-groupé pour les permission de commande",
		ja: "コマンド権限のサブコマンド！",
		ru: "Подкоманда для разрешений команд!",
		"es-ES": "Subcomando para permisos de comando!"
	},

	options: [
		{
			name: "set-user",

			description: "Set permission to user",
			description_localizations: {
				fr: "Définir une permission à un utilisateur",
				ja: "ユーザーに権限を設定",
				ru: "Установить разрешения пользователю",
				"es-ES": "Establecer permiso al usuario"
			},

			options: [
				{
					name: "user",

					description: "Member you want",
					description_localizations: {
						fr: "Le membre que vous souhaiter modifier la permission",
						ja: "対象のメンバー",
						ru: "Участник, которого вы хотите",
						"es-ES": "Miembro que deseas"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				},
				{
					name: "permission",

					description: "permission you want to set for the member",
					description_localizations: {
						fr: "La permission que vous souhaiter modifier au membre",
						ja: "メンバーに設定したい権限",
						ru: "разрешение для участника",
						"es-ES": "permiso que quieres establecer para el miembro"
					},

					choices: permissionLevel,

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "command",

			description: "Set a specific permission to use one command",
			description_localizations: {
				fr: "Définir une permission spécifique pour l'utilisation d'une commande",
				ja: "1つのコマンドを使用するための特定の権限を設定",
				ru: "Установить разрешение для использования команды",
				"es-ES": "Establecer un permiso específico para usar un comando"
			},

			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What you want to do?",
					description_localizations: {
						fr: "Que veux-tu faire?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?"
					},

					required: true,
					choices: [
						{
							name: "Change command permission",
							name_localizations: {
								fr: "Modifier la permission de commande",
								ja: "change_command_permission",
								ru: "change_command_permission",
								"es-ES": "change_command_permission"
							},
							value: "change"
						},
						{
							name: "Delete command permission",
							name_localizations: {
								fr: "Supprimer la permission de commande",
								ja: "delete_command_permission",
								ru: "delete_command_permission",
								"es-ES": "delete_command_permission"
							},
							value: "delete"
						},
						{
							name: "Delete permission (role/user/level)",
							name_localizations: {
								fr: "Supprimer la permission (rôle/utilisateur/niveau)",
								ja: "delete_permission_role_user_leve",
								ru: "delete_permission_role_user_leve",
								"es-ES": "delete_permission_role_user_leve"
							},
							value: "delete-all"
						},
						{
							name: "List all commands permission set",
							name_localizations: {
								fr: "Liste toutes les permissions de commande",
								ja: "list_all_commands_permission_set",
								ru: "list_all_commands_permission_set",
								"es-ES": "list_all_commands_permission_set"
							},
							value: "list"
						}
					],

					permission: null
				},
				{
					name: "command",

					description: "The command you want to update",
					description_localizations: {
						fr: "La commande que vous souhaiter modifier",
						ja: "更新したいコマンド",
						ru: "Команда, которую вы хотите обновить",
						"es-ES": "El comando que quieres actualizar"
					},

					autocomplete: true,
					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				},
				{
					name: "permission",

					description: "The permission for the selected command",
					description_localizations: {
						fr: "La permission pour la commande choisie",
						ja: "選択したコマンドの権限",
						ru: "Разрешение для выбранной команды",
						"es-ES": "El permiso para el comando seleccionado"
					},

					choices: permissionLevel,
					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				},
				{
					name: "custom-role",

					description:
						"The custom role you want to set for the command",
					description_localizations: {
						fr: "Le role personnalisé que vous souhaiter définir pour la commande",
						ja: "コマンドに設定したいカスタムロール",
						ru: "Пользовательская роль для команды",
						"es-ES": "El rol personalizado que quieres establecer para el comando"
					},

					type: ApplicationCommandOptionType.Role,

					required: false,

					permission: null
				},
				{
					name: "custom-user",

					description:
						"The custom user you want to set for the command",
					description_localizations: {
						fr: "L'utilisateur personnalisé que vous souhaiter définir pour la commande",
						ja: "コマンドに設定したいカスタムユーザー",
						ru: "Пользователь для команды",
						"es-ES": "El usuario personalizado que quieres establecer para el comando"
					},

					type: ApplicationCommandOptionType.User,

					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "list",
			prefixName: "perm-list",

			description: "show all granted user in the guild",
			description_localizations: {
				fr: "Afficher toute les permission d'utilisateur du serveur",
				ja: "サーバー内の権限付与ユーザーを全て表示",
				ru: "показать всех пользователей с правами",
				"es-ES": "mostrar todos los usuarios con permisos en el servidor"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "edit-roles",

			description: "edit the permission roles into the guild",
			description_localizations: {
				fr: "Modifier les rôle Perm du serveur",
				ja: "サーバーの権限ロールを編集",
				ru: "редактировать роли разрешений на сервере",
				"es-ES": "editar los roles de permiso en el servidor"
			},

			options: [
				{
					name: "perm_level",
					name_localizations: {
						fr: "niveau_perm",
						ja: "perm_level",
						ru: "perm_level",
						"es-ES": "perm_level"
					},

					description: "Permission level to edit",
					description_localizations: {
						fr: "Niveau de permission à modifier",
						ja: "編集する権限レベル",
						ru: "Уровень разрешений для редактирования",
						"es-ES": "Nivel de permiso a editar"
					},

					choices: permissionLevel.filter((x) => x.value !== "0"),
					permission: null,
					required: true,
					type: ApplicationCommandOptionType.String
				},
				{
					name: "perm_role",

					description: "Role Permission to edit",
					description_localizations: {
						fr: "Rôle de niveau de permission à modifier",
						ja: "編集するロール権限",
						ru: "Разрешение роли для редактирования",
						"es-ES": "Permiso de rol a editar"
					},

					permission: null,
					required: true,
					type: ApplicationCommandOptionType.Role
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "create-roles",

			description: "Create roles for the permission",
			description_localizations: {
				fr: "Créer les roles pour les permissions",
				ja: "権限用のロールを作成",
				ru: "Создать роли для разрешений",
				"es-ES": "Crear roles para los permisos"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],

	async autocomplete(client, interaction) {
		const focusedOption = interaction.options.getFocused(true);
		const choices: string[] = [];

		if (focusedOption.name === "command") {
			const getCommandChoices = (
				command: Command | Option,
				parentName = ""
			) => {
				const commandName = parentName
					? `${parentName} ${command.name}`
					: command.name;
				choices.push(commandName);

				if (command.options) {
					command.options.forEach((option) => {
						if (
							option.type ===
								ApplicationCommandOptionType.SubcommandGroup ||
							option.type ===
								ApplicationCommandOptionType.Subcommand
						) {
							getCommandChoices(option, commandName);
						}
					});
				}
			};

			client.commands.forEach((command: Command) => {
				getCommandChoices(command);
			});
		}

		const filtered = choices
			.filter(
				(choice) =>
					choice.includes(focusedOption.value) ||
					choice.startsWith(focusedOption.value)
			)
			.slice(0, 25);

		await interaction.respond(
			filtered.map((choice) => ({
				name: choice,
				value: choice
			}))
		);
	},

	thinking: true,
	category: "guildconfig",
	type: ApplicationCommandType.ChatInput,

	permission: null
};

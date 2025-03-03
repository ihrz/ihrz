/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	Client,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message,
	GuildMember,
	PermissionFlagsBits,
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

export function generateRoleFields(
	roleData: DatabaseStructure.EconomyModel["buyableRoles"],
	lang: LanguageData,
) {
	return Object.entries(roleData || {})
		.sort(([, amountA], [, amountB]) => Number(amountB) - Number(amountA))
		.map(([roleID, roleData], index) => ({
			name: `Role ${index + 1}`,
			value: `${lang.var_roles}: <@&${roleID}>\n${lang.var_price}: ${roleData.price}\nBoost: x${roleData.boost || 1}`,
			amount: roleData.price,
			inline: true,
		}));
}

export async function getMemberBoost(member: GuildMember): Promise<number> {
	try {
		let economyConfig = (await member.guild.client.db.get(
			`${member.guild.id}.ECONOMY`,
		)) as DatabaseStructure.EconomyModel;

		// get the roles that the user has
		let role = Object.entries(economyConfig?.buyableRoles || [])
			.filter(([roleID]) => member?.roles.cache.has(roleID))
			.map(([roleID]) => roleID);

		// get the role with the highest boost
		let highestBoost = role
			.map((r) => economyConfig?.buyableRoles?.[r]?.boost ?? 0)
			.sort((a, b) => b - a)[0];

		// calculate the new money amount and add it to the user
		return highestBoost || 1;
	} catch {
		return 1;
	}
}

export const command: Command = {
	name: "economy",
	name_localizations: {
		fr: "économie",
	},

	description: "Subcommand for economy category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie d'économie",
	},

	options: [
		{
			name: "balance-add",

			description: "Add money to a user!",
			description_localizations: {
				fr: "Ajoutez de l'argent à un utilisateur",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "The amount of money you want to add",
					description_localizations: {
						fr: "Le montant d'argent que vous souhaitez ajouter",
					},

					required: true,

					permission: null,
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member who you want to add money",
					description_localizations: {
						fr: "Le membre à qui vous souhaitez ajouter de l'argent",
					},

					required: true,

					permission: null,
				},
			],

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "balance-remove",

			description: "Remove money from a user!",
			description_localizations: {
				fr: "Retirer de l'argent à un utilisateur",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "amount of $ you want add",
					description_localizations: {
						fr: "montant de $ que vous souhaitez ajouter",
					},

					required: true,

					permission: null,
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to add the money",
					description_localizations: {
						fr: "le membre auquel vous souhaitez ajouter de l'argent",
					},

					required: true,
					permission: null,
				},
			],

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "balance",

			description: "Get the balance of a user!",
			description_localizations: {
				fr: "Obtenir le solde d'un utilisateur",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description:
						"Target a user for see their current balance or keep blank for yourself",
					description_localizations: {
						fr: "Ciblez un utilisateur pour voir son solde actuel",
					},

					required: false,

					permission: null,
				},
			],

			permission: null,
		},
		{
			name: "disable",
			prefixName: "economy-disable",

			description: "Disable the economy module into your guild",
			description_localizations: {
				fr: "Désactiver entièrement le module d'économie sur un serveur",
			},

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
					},

					type: ApplicationCommandOptionType.String,

					choices: [
						{
							name: "Enable the module",
							value: "on",
						},
						{
							name: "Disable the module",
							value: "off",
						},
					],

					required: true,

					permission: null,
				},
			],

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "leaderboard",
			prefixName: "economy-leaderboard",

			description: "Get the users balance's leaderboard of the guild!",
			description_localizations: {
				fr: "Obtenez le classement du solde des utilisateurs du serveur",
			},

			aliases: ["eclb", "eco-lb", "economy-lb"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null,
		},
		{
			name: "deposit",

			description: "Deposit coin in your bank!",
			description_localizations: {
				fr: "Déposez des pièces dans votre banque",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "how-much",
					type: ApplicationCommandOptionType.String,

					description: "How much coin you want to deposit in your bank?",
					description_localizations: {
						fr: "Combien de pièces vous souhaitez déposer dans votre banque",
					},

					required: true,

					permission: null,
				},
			],

			permission: null,
		},
		{
			name: "daily",

			description: "Claim a daily reward!",
			description_localizations: {
				fr: "Réclamez une récompense quotidienne",
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null,
		},
		{
			name: "monthly",

			description: "Claim a monthly reward!",
			description_localizations: {
				fr: "Réclamez une récompense mensuelle",
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null,
		},
		{
			name: "weekly",

			description: "Claim a weekly reward!",
			description_localizations: {
				fr: "Réclamez une récompense hebdomadaire",
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null,
		},
		{
			name: "pay",

			description: "Pay a user a certain amount!",
			description_localizations: {
				fr: "Payer à un utilisateur un certain montant",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "The amount of money you want to donate to them",
					description_localizations: {
						fr: "Le montant d’argent que vous souhaitez lui donner",
					},

					required: true,

					permission: null,
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member you want to donate the money",
					description_localizations: {
						fr: "Le membre à qui vous souhaitez donner de l'argent",
					},

					required: true,

					permission: null,
				},
			],

			permission: null,
		},
		{
			name: "rob",

			description: "Rob a user!",
			description_localizations: {
				fr: "Volé de l'argent d'un utilisateur",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to rob a money",
					description_localizations: {
						fr: "le membre à qui tu veux voler de l'argent",
					},

					required: true,

					permission: null,
				},
			],

			permission: null,
		},
		{
			name: "withdraw",

			description: "Withdraw coin from your bank!",
			description_localizations: {
				fr: "Retirer des pièces de votre banque",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "how-much",
					type: ApplicationCommandOptionType.String,

					description: "How much coin you want to withdraw from your bank?",
					description_localizations: {
						fr: "Combien de pièces vous souhaitez retirer de votre banque",
					},

					required: true,

					permission: null,
				},
			],

			permission: null,
		},
		{
			name: "work",

			description: "Claim a work reward!",
			description_localizations: {
				fr: "Réclamez une récompense de travail",
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null,
		},
		{
			name: "role",
			prefixName: "economy-role",

			description: "Set a role for a certain amount of money!",
			description_localizations: {
				fr: "Définir un rôle pour un certain montant d'argent",
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: "add",
					prefixName: "economy-role-add",

					description: "Add a role for a certain amount of money!",
					description_localizations: {
						fr: "Ajouter un rôle pour un certain montant d'argent",
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "role",
							type: ApplicationCommandOptionType.Role,

							description: "The role you want to add",
							description_localizations: {
								fr: "Le rôle que vous souhaitez ajouter",
							},

							required: true,

							permission: null,
						},
						{
							name: "amount",
							type: ApplicationCommandOptionType.Number,

							description: "The amount of money you want to add",
							description_localizations: {
								fr: "Le montant d'argent que vous souhaitez ajouter",
							},

							required: true,

							permission: null,
						},
					],

					permission: PermissionFlagsBits.ManageGuild,
				},
				{
					name: "delete",
					prefixName: "economy-role-delete",

					description: "Delete a role for a certain amount of money!",
					description_localizations: {
						fr: "Supprimer un rôle pour un certain montant d'argent",
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "role",
							type: ApplicationCommandOptionType.Role,

							description: "The role you want to delete",
							description_localizations: {
								fr: "Le rôle que vous souhaitez supprimer",
							},

							required: true,

							permission: null,
						},
					],

					permission: PermissionFlagsBits.ManageGuild,
				},
				{
					name: "list",
					prefixName: "economy-role-list",

					description: "List all roles that you can buy!",
					description_localizations: {
						fr: "Liste de tous les rôles que vous pouvez acheter",
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild,
				},
			],

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "boost-set",
			prefixName: "economy-boost-set",

			description: "Set a money boost for a certain role!",
			description_localizations: {
				fr: "Définir un boost d'argent pour un certain rôle",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "The role you want to modify the boost",
					description_localizations: {
						fr: "Le rôle que vous souhaitez modifier le boost",
					},

					required: true,

					permission: null,
				},
				{
					name: "boost",
					type: ApplicationCommandOptionType.String,

					description: "The boost you want to add",
					description_localizations: {
						fr: "Le boost que vous souhaitez ajouter",
					},

					choices: [
						{
							name: "Default",
							value: "1",
						},
						{
							name: "x2",
							value: "2",
						},
						{
							name: "x3",
							value: "3",
						},
						{
							name: "x4",
							value: "4",
						},
						{
							name: "x5",
							value: "5",
						},
					],

					required: true,

					permission: null,
				},
			],

			permission: PermissionFlagsBits.ManageGuild,
		},
		{
			name: "manage-rewards",

			description:
				"Manage how much money you can get from daily, weekly and monthly!",
			description_localizations: {
				fr: "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement",
			},

			type: ApplicationCommandOptionType.SubcommandGroup,
			options: [
				{
					name: "set-money",
					description:
						"Manage how much money you can get from daily, weekly and monthly!",
					description_localizations: {
						fr: "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement",
					},
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "type",
							type: ApplicationCommandOptionType.String,
							description: "The type of reward you want to set",
							description_localizations: {
								fr: "Le type de récompense que vous souhaitez définir",
							},
							choices: [
								{
									name: "Daily",
									value: "daily",
								},
								{
									name: "Weekly",
									value: "weekly",
								},
								{
									name: "Monthly",
									value: "monthly",
								},
							],
							required: true,

							permission: null,
						},
						{
							name: "how-much",
							type: ApplicationCommandOptionType.Number,
							description: "How much money you want to set",
							description_localizations: {
								fr: "Combien d'argent vous souhaitez définir",
							},
							required: true,

							permission: null,
						},
					],

					permission: PermissionFlagsBits.Administrator,
				},
				{
					name: "set-cooldown",
					description: "Manage the cooldown of the actions!",
					description_localizations: {
						fr: "Gérer le temps de recharge des actions",
					},
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "type",
							type: ApplicationCommandOptionType.String,
							description: "Les actions que vous souhaitez définir",
							description_localizations: {
								fr: "Les actions que vous souhaitez définir",
							},
							choices: [
								{
									name: "Rob",
									value: "rob",
								},
								{
									name: "Work",
									value: "work",
								},
							],
							required: true,
							permission: null,
						},
						{
							name: "time",
							type: ApplicationCommandOptionType.String,
							description: "The time you want to set",
							description_localizations: {
								fr: "Le temps que vous souhaitez définir",
							},
							required: true,
							permission: null,
						},
					],

					permission: PermissionFlagsBits.Administrator,
				},
			],

			permission: null,
		},
		{
			name: "shop",
			prefixName: "shop",

			description: "Get the shop of the guild!",
			description_localizations: {
				fr: "Obtenez le magasin du serveur",
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null,
		},
	],
	thinking: false,
	category: "economy",
	type: ApplicationCommandType.ChatInput,
	permission: null,
};

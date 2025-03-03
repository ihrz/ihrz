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
	EmbedBuilder,
	ChannelType,
	PermissionsBitField,
	PermissionFlagsBits,
} from "discord.js";

import { Command } from "../../../../types/command.js";


export const command: Command = {
	name: "ranks",

	description: "Subcommand for ranks category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de niveau (message)",
	},

	options: [
		{
			name: "config",
			prefixName: "ranks-config",

			description: "When user earn a ranks's level, give it a role!",
			description_localizations: {
				fr: "Lorsque l'utilisateur atteint un niveau de rang, attribuez-lui un rôle !",
			},

			aliases: ["rconfig"],

			type: ApplicationCommandOptionType.Subcommand,
			thinking: true,

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "disable",
			prefixName: "ranks-disable",

			name_localizations: {
				fr: "statut",
			},

			description: "Disable the message when user earn new xp level message!",
			description_localizations: {
				fr: "Désactivez le message lorsque l'utilisateur gagne un nouveau message de niveau XP",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What you want to do?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
					},

					required: true,
					choices: [
						{
							name: "Power On the module (send message when user earn xp level)",
							value: "on",
						},
						{
							name: "Power Off the module (don't send any message but user still earn xp level)",
							value: "off",
						},
						{
							name: "Disable the module (don't send any message and user don't earn xp level)",
							value: "disable",
						},
					],

					permission: null,
				},
			],

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "show",
			prefixName: "ranks-show",

			name_localizations: {
				fr: "afficher",
			},

			description: "Get the user's xp level!",
			description_localizations: {
				fr: "Obtenez le niveau XP de l'utilisateur",
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
					},

					required: false,

					permission: null,
				},
			],

			thinking: true,
			permission: null,
		},
		{
			name: "ureset",
			prefixName: "ranks-ureset",

			description: "Reset the ranks level of an user",
			description_localizations: {
				fr: "Supprimer les données de rang d'un utilisateur",
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to reset the ranks data",
					description_localizations: {
						fr: "L'utilisateur que vous voulez supprimer du module de rangs.",
					},

					required: true,
					permission: null,
				},
			],

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "greset",
			prefixName: "ranks-greset",

			description: "Reset the ranks level of every user in the guild",
			description_localizations: {
				fr: "Supprimer les données de rang de tout les utilisateur",
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "channel",
			prefixName: "ranks-channel",

			name_localizations: {
				fr: "définir-cannal",
			},

			description: "Set the channel where user earn new xp level message!",
			description_localizations: {
				fr: "Définir le canal sur lequel l'utilisateur gagne un nouveau message de niveau XP",
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
					},

					required: true,
					choices: [
						{
							name: "Remove the module (send xp message on the user's message channel)",
							value: "off",
						},
						{
							name: "Power on the module (send xp message on a specific channel)",
							value: "on",
						},
					],

					permission: null,
				},
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,

					description: "The specific channel for xp message !",
					description_localizations: {
						fr: "Le canal spécifique pour le message XP",
					},

					channel_types: [ChannelType.GuildText],

					required: false,

					permission: null,
				},
			],

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "leaderboard",
			prefixName: "ranks-leaderboard",

			name_localizations: {
				fr: "classement",
			},

			description: "Get the xp's leaderboard of the guild!",
			description_localizations: {
				fr: "Obtenez le classement XP du serveur",
			},

			aliases: ["rankslb"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null,
		},
		{
			name: "ignore-channels",
			prefixName: "ranks-ignore-channels",

			description: "Ignore this channels in the Ranks Module",
			description_localizations: {
				fr: "Ignorer des salons afin que le module de Rangs ne l'ai prennent pas en compte",
			},

			aliases: ["ignore"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "message",
			prefixName: "ranks-message",

			description: "Set a custom message when user earn level",
			description_localizations: {
				fr: "Définir un message personalisé quand un membre gagne un niveaus",
			},

			aliases: ["msg"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,
		},
	],
	thinking: false,
	category: "ranks",
	type: ApplicationCommandType.ChatInput,
	permission: null,
};

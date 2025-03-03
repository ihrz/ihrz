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
	ChannelType,
	PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: "ticket",

	description: "Subcommand for ticket category!",
	description_localizations: {
		"fr": "Commande sous-groupé pour la catégorie de ticket"
	},

	options: [
		{
			name: "add-member",

			description: "Add a member into your ticket!",
			description_localizations: {
				"fr": "Ajoutez un membre dans votre ticket"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,

					description: 'The user you want to add into your ticket',
					description_localizations: {
						"fr": "L'utilisateur que vous souhaitez ajouter à votre ticket"
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
				"fr": "Fermer un ticket"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "rename",

			description: "Rename a ticket!",
			description_localizations: {
				"fr": "Rénommer un ticket"
			},

			options: [
				{
					name: "name",

					description: "The new name of the ticket channel.",
					description_localizations: {
						"fr": "Le nouveau nom du canal de ticket"
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
			name: "delete",
			prefixName: "ticket-delete",

			description: "Delete a iHorizon ticket!",
			description_localizations: {
				"fr": "Supprimer un ticket"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "disable",
			prefixName: "ticket-disable",

			description: "Disable ticket commands on a guild!",
			description_localizations: {
				"fr": "Désactiver les commande de ticket au seins du serveur"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'action',
					type: ApplicationCommandOptionType.String,

					description: 'What you want to do ?',
					description_localizations: {
						"fr": "Que veux-tu faire? "
					},

					required: true,
					choices: [
						{
							name: "Remove the module",
							value: "off"
						},
						{
							name: 'Power on the module',
							value: "on"
						},
					],

					permission: null
				},
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'log-channel',

			description: "Set a channel where iHorizon sent a logs about tickets!",
			description_localizations: {
				"fr": "Définir un canal sur lequel iHorizon a envoyé des journaux sur les tickets"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'channel',
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					description: 'Where you want the logs',
					description_localizations: {
						"fr": "Où voulez-vous les journaux ?"
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
				"fr": "Re-ouvrir un ticket fermet"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: 'remove-member',

			description: "Remove a member from your ticket!",
			description_localizations: {
				"fr": "Enlever un membre d'un ticket"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,

					description: 'The user you want to remove into your ticket',
					description_localizations: {
						"fr": "L'utilisateur que vous souhaitez supprimer de votre ticket"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "set-here",

			description: "Make a embed for allowing to user to create a ticket!",
			description_localizations: {
				"fr": "Créer un embed pour permettre à l'utilisateur de créer un ticket"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "name",

					description: "The name of you ticket's panel.",
					description_localizations: {
						"fr": "Le nom du panneau de votre ticket"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "description",

					description: "The description of you ticket's panel.",
					description_localizations: {
						"fr": "La description du panneau de votre ticket"
					},

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				},
				{
					name: "category",

					description: "The category for the ticket.",
					description_localizations: {
						"fr": "La catégorie pour les ticket"
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
				"fr": "Créer un panel pour customiser le système de ticket"
			},

			options: [
				{
					name: "panel_id",

					description: "ID of your panel",
					description_localizations: {
						"fr": "L'identifiant du panel"
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
				"fr": "Définir la catégorie dans laquelle les ticket doivent être créés"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "category-name",

					description: "The name of you ticket's panel.",
					description_localizations: {
						"fr": "Le nom du panneau de votre ticket"
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
				"fr": "Obtenir la transcription d'un message de ticket"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
	],
	thinking: true,
	category: 'ticket',
	type: ApplicationCommandType.ChatInput,

	permission: null
};
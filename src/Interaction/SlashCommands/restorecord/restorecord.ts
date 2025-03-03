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
	EmbedBuilder,
	PermissionsBitField,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	BaseGuildTextChannel,
	ApplicationCommandType,
	Message,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Channel,
	GuildTextBasedChannel,
	ActionRowBuilder,
	PermissionFlagsBits
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: 'restorecord',

	description: 'Do the same thing as restorecord with link verification button under iHorizon message',
	description_localizations: {
		"fr": "Faites la même chose que restorecord avec le bouton de vérification du lien sous le message iHorizon"
	},

	aliases: [],
	options: [
		{
			name: "set",

			description: "Set the current message for RestoreCord button",
			description_localizations: {
				"fr": "Définir le message actuel pour le bouton de RestoreCord"
			},

			options: [
				{
					name: 'channel',
					type: ApplicationCommandOptionType.Channel,

					description: "The channel where is the message",
					description_localizations: {
						"fr": "Le salon textuelle où se trouve le message"
					},

					channel_types: [ChannelType.GuildText],

					required: true,

					permission: null
				},
				{
					name: 'messageid',
					type: ApplicationCommandOptionType.String,

					description: "Please copy the identifiant of the message you want to configure",
					description_localizations: {
						"fr": "Veuillez copier l'identifiant du message que vous souhaitez configurer"
					},

					required: true,

					permission: null
				},
				{
					name: 'role',
					type: ApplicationCommandOptionType.Role,

					description: 'The role you want to configure',
					description_localizations: {
						"fr": "Le rôle que vous souhaitez configurer"
					},

					required: false,

					permission: null
				}
			],

			thinking: true,
			ephemeral: true,

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "delete",

			description: "Delete the RestoreCord module button",
			description_localizations: {
				"fr": "Supprimer le bouton du module de RestoreCord"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "get",

			description: "Get all informations about the RestoreCord module of the guild",
			description_localizations: {
				"fr": "Obtenez toutes les informations sur le module RestoreCord de votre guilde"
			},

			options: [
				{
					name: 'key',
					type: ApplicationCommandOptionType.String,

					description: "The private key of your RestoreCord config",
					description_localizations: {
						"fr": "La clé privée de votre configuration RestoreCord"
					},

					required: true,

					permission: null
				},
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "force-join",

			description: "Force all members of your RestoreCord module to join the guild",
			description_localizations: {
				"fr": "Forcer tous les membres de votre module RestoreCord à rejoindre la guilde"
			},

			options: [
				{
					name: 'key',
					type: ApplicationCommandOptionType.String,

					description: "The private key of your RestoreCord config",
					description_localizations: {
						"fr": "La clé privée de votre configuration RestoreCord"
					},

					required: true,

					permission: null
				},
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "roles",

			description: "Set new roles for the RestoreCord module",
			description_localizations: {
				"fr": "Définir un nouveau rôle pour le module RestoreCord"
			},

			options: [
				{
					name: 'key',
					type: ApplicationCommandOptionType.String,

					description: "The private key of your RestoreCord config",
					description_localizations: {
						"fr": "La clé privée de votre configuration RestoreCord"
					},

					required: true,

					permission: null
				},
				{
					name: 'roles',
					type: ApplicationCommandOptionType.Role,

					description: "The new roles for your RestoreCord config",
					description_localizations: {
						"fr": "Le nouveau rôle pour votre configuration RestoreCord"
					},

					required: true,

					permission: null
				},
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},

	],
	category: 'restorecord',
	thinking: true,
	type: ApplicationCommandType.ChatInput,

	permission: null
};
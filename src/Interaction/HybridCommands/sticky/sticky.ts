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
	name: "sticky",
	description: "Manage sticky messages in text channels",
	description_localizations: {
		fr: "Gérer les messages sticky dans les salons textuels"
	},

	options: [
		{
			name: "text",
			prefixName: "sticky-text",
			description: "Create or update a text sticky message",
			description_localizations: {
				fr: "Créer ou modifier un message sticky texte"
			},
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					description: "The text channel",
					description_localizations: {
						fr: "Le salon textuel"
					},
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
					required: true,
					permission: null
				},
				{
					name: "message",
					description: "The sticky message content",
					description_localizations: {
						fr: "Le contenu du message sticky"
					},
					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				}
			],
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "embed",
			prefixName: "sticky-embed",
			description: "Create or update an embed sticky message",
			description_localizations: {
				fr: "Créer ou modifier un message sticky embed"
			},
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					description: "The text channel",
					description_localizations: {
						fr: "Le salon textuel"
					},
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
					required: true,
					permission: null
				},
				{
					name: "embed_id",
					description: "The embed identifier",
					description_localizations: {
						fr: "L'identifiant de l'embed"
					},
					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "message_content",
					description: "Optional text content sent with the embed",
					description_localizations: {
						fr: "Le texte optionnel envoyé avec l'embed"
					},
					type: ApplicationCommandOptionType.String,
					required: false,
					permission: null
				}
			],
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "disable",
			prefixName: "sticky-disable",
			description: "Disable a sticky message in one channel",
			description_localizations: {
				fr: "Désactiver un message sticky dans un salon"
			},
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					description: "The text channel",
					description_localizations: {
						fr: "Le salon textuel"
					},
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
					required: true,
					permission: null
				}
			],
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "show",
			prefixName: "sticky-show",
			description: "Show the sticky configuration of one channel",
			description_localizations: {
				fr: "Afficher la configuration sticky d'un salon"
			},
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					description: "The text channel",
					description_localizations: {
						fr: "Le salon textuel"
					},
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
					required: true,
					permission: null
				}
			],
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "list",
			prefixName: "sticky-list",
			description: "List all sticky channels",
			description_localizations: {
				fr: "Lister tous les salons sticky"
			},
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "refresh",
			prefixName: "sticky-refresh",
			description: "Repost the sticky message in one channel",
			description_localizations: {
				fr: "Republier le message sticky dans un salon"
			},
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					description: "The text channel",
					description_localizations: {
						fr: "Le salon textuel"
					},
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
					required: true,
					permission: null
				}
			],
			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "sticky",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

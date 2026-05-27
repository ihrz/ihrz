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
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "starboard",
	aliases: [],

	category: "starboard",
	description: "SubCommand group for Starboard category",
	description_localizations: {
		fr: "sous-commande groupé pour la catégorie Starboard"
	},

	permission: [PermissionFlagsBits.Administrator],
	thinking: false,

	options: [
		{
			name: "config",
			prefixName: "starboarconfig",

			description: "Enable or disable the module",
			description_localizations: {
				fr: "désactiver ou activer le module"
			},

			options: [
				{
					name: "action",

					description: "What you want to do ?",
					description_localizations: {
						fr: "que voulez-vous faire?"
					},

					choices: [
						{
							name: "Power On",
							name_localizations: { fr: "Activer" },
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: { fr: "Désactiver" },
							value: "off"
						}
					],

					required: true,
					type: ApplicationCommandOptionType.String,

					permission: null
				}
			],

			permission: [PermissionFlagsBits.Administrator],

			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "channel",
			prefixName: "starboard-channel",

			description:
				"Change the channel which are send the most starred messages",
			description_localizations: {
				fr: "Changer le salon où sont envoyer les messages avec le plus d'étoile."
			},

			options: [
				{
					name: "to",

					description: "the channel you want",
					description_localizations: {
						fr: "Le salon que vous souhaitez"
					},

					permission: null,
					required: true,
					channel_types: [
						ChannelType.GuildText,
						ChannelType.GuildAnnouncement
					],

					type: ApplicationCommandOptionType.Channel
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: [PermissionFlagsBits.Administrator]
		},
		{
			name: "threshold",
			name_localizations: {
				fr: "seuil"
			},
			prefixName: "starboardthreshold",

			description:
				"Set the star threshold needed for being referenced into the channel",
			description_localizations: {
				fr: "Définissez le seuil d'étoiles nécessaire pour être référencé dans le canal."
			},

			options: [
				{
					name: "amount",

					description: "the threshold",
					description_localizations: {
						fr: "Le seuil/pallier"
					},

					type: ApplicationCommandOptionType.Number,
					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: [PermissionFlagsBits.Administrator]
		},
		{
			name: "create-thread",
			prefixName: "starboardthread",

			description:
				"Create a thread bellow the message into the star channel ?",
			description_localizations: {
				fr: "Créer un fil de discussion en dessous du message dans le canal ?"
			},

			options: [
				{
					name: "action",

					description: "What you want to do?",
					description_localizations: {
						fr: "que voulez-vous faire?"
					},

					choices: [
						{
							name: "Create thread",
							name_localizations: { fr: "Créer un fil" },
							value: "yes"
						},
						{
							name: "Don't create thread",
							name_localizations: { fr: "Ne pas créer un fil" },
							value: "no"
						}
					],

					type: ApplicationCommandOptionType.String,
					permission: null,
					required: true
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: [PermissionFlagsBits.Administrator]
		}
	],

	type: ApplicationCommandType.ChatInput
};

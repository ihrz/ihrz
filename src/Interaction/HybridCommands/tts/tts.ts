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
	ApplicationCommandType
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "tts",
	name_localizations: {
		fr: "tts"
	},

	description: "Subcommand for TTS (Text-to-Speech) category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie TTS (Text-to-Speech)"
	},

	aliases: [],

	options: [
		{
			name: "join",

			description: "Join the voice channel and enable TTS mode!",
			description_localizations: {
				fr: "Rejoindre le salon vocal et activer le mode TTS"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "leave",

			description: "Leave the voice channel and disable TTS mode!",
			description_localizations: {
				fr: "Quitter le salon vocal et désactiver le mode TTS"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "info",

			description: "Get information about the TTS module!",
			description_localizations: {
				fr: "Obtenir des informations sur le module TTS"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "lang",
			name_localizations: {
				fr: "langue"
			},

			prefixName: "ttslang",

			description: "Set the default TTS language for the guild!",
			description_localizations: {
				fr: "Définir la langue TTS par défaut du serveur"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "language",
					name_localizations: {
						fr: "langue"
					},

					description: "The TTS language to use!",
					description_localizations: {
						fr: "La langue TTS à utiliser"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					choices: [
						{
							name: "English",
							name_localizations: { fr: "Anglais" },
							value: "en-US"
						},
						{
							name: "French",
							name_localizations: { fr: "Francais" },
							value: "fr-FR"
						},
						{
							name: "German",
							name_localizations: { fr: "Allemand" },
							value: "de-DE"
						},
						{
							name: "Spanish",
							name_localizations: { fr: "Espagnol" },
							value: "es-ES"
						},
						{
							name: "Italian",
							name_localizations: { fr: "Italien" },
							value: "it-IT"
						},
						{
							name: "Japanese",
							name_localizations: { fr: "Japonais" },
							value: "jp-JP"
						},
						{
							name: "Portuguese",
							name_localizations: { fr: "Portugais" },
							value: "pt-PT"
						},
						{
							name: "Russian",
							name_localizations: { fr: "Russe" },
							value: "ru-RU"
						},
						{
							name: "Arabic",
							name_localizations: { fr: "Arabe" },
							value: "ar-EG"
						}
					],

					permission: null
				}
			],

			permission: null
		}
	],
	thinking: false,
	category: "tts",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

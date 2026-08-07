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
		fr: "tts",
		ja: "tts",
		ru: "tts",
		"es-ES": "tts"
	},

	description: "Subcommand for TTS (Text-to-Speech) category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie TTS (Text-to-Speech)",
		ja: "TTS（テキスト読み上げ）カテゴリのサブコマンド！",
		ru: "Подкоманда для категории TTS (озвучивание текста)!",
		"es-ES": "Subcomando para la categoría TTS (Texto a Voz)!"
	},

	aliases: [],

	options: [
		{
			name: "join",

			description: "Join the voice channel and enable TTS mode!",
			description_localizations: {
				fr: "Rejoindre le salon vocal et activer le mode TTS",
				ja: "ボイスチャンネルに参加してTTSモードを有効化！",
				ru: "Войти в голосовой канал и включить TTS!",
				"es-ES": "Unirse al canal de voz y habilitar el modo TTS!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "leave",

			description: "Leave the voice channel and disable TTS mode!",
			description_localizations: {
				fr: "Quitter le salon vocal et désactiver le mode TTS",
				ja: "ボイスチャンネルから退出してTTSモードを無効化！",
				ru: "Выйти из голосового канала и отключить TTS!",
				"es-ES": "Salir del canal de voz y deshabilitar el modo TTS!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "info",

			description: "Get information about the TTS module!",
			description_localizations: {
				fr: "Obtenir des informations sur le module TTS",
				ja: "TTSモジュールの情報を取得！",
				ru: "Получить информацию о модуле TTS!",
				"es-ES": "Obtener información sobre el módulo TTS!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "lang",
			name_localizations: {
				fr: "langue",
				ja: "lang",
				ru: "lang",
				"es-ES": "lang"
			},

			prefixName: "ttslang",

			description: "Set the default TTS language for the guild!",
			description_localizations: {
				fr: "Définir la langue TTS par défaut du serveur",
				ja: "サーバーのデフォルトTTS言語を設定！",
				ru: "Установить язык TTS по умолчанию!",
				"es-ES": "Establecer el idioma TTS predeterminado para el servidor!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "language",
					name_localizations: {
						fr: "langue",
						ja: "language",
						ru: "language",
						"es-ES": "language"
					},

					description: "The TTS language to use!",
					description_localizations: {
						fr: "La langue TTS à utiliser",
						ja: "使用するTTS言語！",
						ru: "Язык TTS для использования!",
						"es-ES": "El idioma TTS a usar!"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					choices: [
						{
							name: "English",
							name_localizations: {
								fr: "Anglais",
								ja: "english",
								ru: "english",
								"es-ES": "english"
							},
							value: "en-US"
						},
						{
							name: "French",
							name_localizations: {
								fr: "Francais",
								ja: "french",
								ru: "french",
								"es-ES": "french"
							},
							value: "fr-FR"
						},
						{
							name: "German",
							name_localizations: {
								fr: "Allemand",
								ja: "german",
								ru: "german",
								"es-ES": "german"
							},
							value: "de-DE"
						},
						{
							name: "Spanish",
							name_localizations: {
								fr: "Espagnol",
								ja: "spanish",
								ru: "spanish",
								"es-ES": "spanish"
							},
							value: "es-ES"
						},
						{
							name: "Italian",
							name_localizations: {
								fr: "Italien",
								ja: "italian",
								ru: "italian",
								"es-ES": "italian"
							},
							value: "it-IT"
						},
						{
							name: "Japanese",
							name_localizations: {
								fr: "Japonais",
								ja: "japanese",
								ru: "japanese",
								"es-ES": "japanese"
							},
							value: "jp-JP"
						},
						{
							name: "Portuguese",
							name_localizations: {
								fr: "Portugais",
								ja: "portuguese",
								ru: "portuguese",
								"es-ES": "portuguese"
							},
							value: "pt-PT"
						},
						{
							name: "Russian",
							name_localizations: {
								fr: "Russe",
								ja: "russian",
								ru: "russian",
								"es-ES": "russian"
							},
							value: "ru-RU"
						},
						{
							name: "Arabic",
							name_localizations: {
								fr: "Arabe",
								ja: "arabic",
								ru: "arabic",
								"es-ES": "arabic"
							},
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

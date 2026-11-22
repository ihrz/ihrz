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
		"es-ES": "tts",
		ko: "tts",
		uk: "tts",
		de: "tts",
		it: "tts",
		"pt-BR": "tts",
		pl: "tts"
	},

	description: "Subcommand for TTS (Text-to-Speech) category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie TTS (Text-to-Speech)",
		ja: "TTS（テキスト読み上げ）カテゴリのサブコマンド！",
		ru: "Подкоманда для категории TTS (озвучивание текста)!",
		"es-ES": "Subcomando para la categoría TTS (Texto a Voz)!",
		ko: "TTS (텍스트 음성 변환) 하위 명령어!",
		uk: "Підкоманда для категорії TTS (синтез мовлення)!",
		de: "Unterbefehle der TTS-Kategorie (Text-to-Speech)!",
		it: "Sottocomandi della categoria TTS (Text-to-Speech)!",
		"pt-BR": "Subcomandos da categoria TTS (Text-to-Speech)!",
		pl: "Podkomendy kategorii TTS (Text-to-Speech)!"
	},

	aliases: [],

	options: [
		{
			name: "join",
			prefixName: "ttsjoin",

			description: "Join the voice channel and enable TTS mode!",
			description_localizations: {
				fr: "Rejoindre le salon vocal et activer le mode TTS",
				ja: "ボイスチャンネルに参加してTTSモードを有効化！",
				ru: "Войти в голосовой канал и включить TTS!",
				"es-ES": "Unirse al canal de voz y habilitar el modo TTS!",
				ko: "음성 채널에 들어가 TTS 모드를 켜요!",
				uk: "Приєднатися до голосового каналу й увімкнути режим TTS!",
				de: "Tritt dem Sprachkanal bei und aktiviere den TTS-Modus!",
				it: "Entra nel canale vocale e attiva la modalità TTS!",
				"pt-BR": "Entre no canal de voz e ative o modo TTS!",
				pl: "Dołącz do kanału głosowego i włącz tryb TTS!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "leave",
			prefixName: "ttsleave",

			description: "Leave the voice channel and disable TTS mode!",
			description_localizations: {
				fr: "Quitter le salon vocal et désactiver le mode TTS",
				ja: "ボイスチャンネルから退出してTTSモードを無効化！",
				ru: "Выйти из голосового канала и отключить TTS!",
				"es-ES": "Salir del canal de voz y deshabilitar el modo TTS!",
				ko: "음성 채널에서 나가고 TTS 모드를 꺼요!",
				uk: "Вийти з голосового каналу й вимкнути режим TTS!",
				de: "Verlasse den Sprachkanal und deaktiviere den TTS-Modus!",
				it: "Esci dal canale vocale e disattiva la modalità TTS!",
				"pt-BR": "Saia do canal de voz e desative o modo TTS!",
				pl: "Opuść kanał głosowy i wyłącz tryb TTS!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "info",
			prefixName: "ttsinfo",

			description: "Get information about the TTS module!",
			description_localizations: {
				fr: "Obtenir des informations sur le module TTS",
				ja: "TTSモジュールの情報を取得！",
				ru: "Получить информацию о модуле TTS!",
				"es-ES": "Obtener información sobre el módulo TTS!",
				ko: "TTS 모듈 정보를 확인해요!",
				uk: "Отримати інформацію про модуль TTS!",
				de: "Infos zum TTS-Modul anzeigen!",
				it: "Ottieni informazioni sul modulo TTS!",
				"pt-BR": "Veja informações sobre o módulo TTS!",
				pl: "Pokaż informacje o module TTS!"
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
				"es-ES": "lang",
				ko: "lang",
				uk: "lang",
				de: "lang",
				it: "lang",
				"pt-BR": "lang",
				pl: "lang"
			},

			prefixName: "ttslang",

			description: "Set the default TTS language for the guild!",
			description_localizations: {
				fr: "Définir la langue TTS par défaut du serveur",
				ja: "サーバーのデフォルトTTS言語を設定！",
				ru: "Установить язык TTS по умолчанию!",
				"es-ES":
					"Establecer el idioma TTS predeterminado para el servidor!",
				ko: "서버의 기본 TTS 언어를 설정해요!",
				uk: "Встановити типову мову TTS для сервера!",
				de: "Legt die Standard-TTS-Sprache des Servers fest!",
				it: "Imposta la lingua TTS predefinita del server!",
				"pt-BR": "Define o idioma TTS padrão do servidor!",
				pl: "Ustawia domyślny język TTS serwera!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "language",
					name_localizations: {
						fr: "langue",
						ja: "language",
						ru: "language",
						"es-ES": "language",
						ko: "language",
						uk: "language",
						de: "language",
						it: "language",
						"pt-BR": "language",
						pl: "language"
					},

					description: "The TTS language to use!",
					description_localizations: {
						fr: "La langue TTS à utiliser",
						ja: "使用するTTS言語！",
						ru: "Язык TTS для использования!",
						"es-ES": "El idioma TTS a usar!",
						ko: "사용할 TTS 언어!",
						uk: "Мова TTS для використання!",
						de: "Die zu verwendende TTS-Sprache!",
						it: "La lingua TTS da usare!",
						"pt-BR": "O idioma TTS a usar!",
						pl: "Język TTS do użycia!"
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
								"es-ES": "english",
								ko: "영어",
								uk: "Англійська",
								de: "Englisch",
								it: "Inglese",
								"pt-BR": "Inglês",
								pl: "Angielski"
							},
							value: "en-US"
						},
						{
							name: "French",
							name_localizations: {
								fr: "Francais",
								ja: "french",
								ru: "french",
								"es-ES": "french",
								ko: "프랑스어",
								uk: "Французька",
								de: "Französisch",
								it: "Francese",
								"pt-BR": "Francês",
								pl: "Francuski"
							},
							value: "fr-FR"
						},
						{
							name: "German",
							name_localizations: {
								fr: "Allemand",
								ja: "german",
								ru: "german",
								"es-ES": "german",
								ko: "독일어",
								uk: "Німецька",
								de: "Deutsch",
								it: "Tedesco",
								"pt-BR": "Alemão",
								pl: "Niemiecki"
							},
							value: "de-DE"
						},
						{
							name: "Spanish",
							name_localizations: {
								fr: "Espagnol",
								ja: "spanish",
								ru: "spanish",
								"es-ES": "spanish",
								ko: "스페인어",
								uk: "Іспанська",
								de: "Spanisch",
								it: "Spagnolo",
								"pt-BR": "Espanhol",
								pl: "Hiszpański"
							},
							value: "es-ES"
						},
						{
							name: "Italian",
							name_localizations: {
								fr: "Italien",
								ja: "italian",
								ru: "italian",
								"es-ES": "italian",
								ko: "이탈리아어",
								uk: "Італійська",
								de: "Italienisch",
								it: "Italiano",
								"pt-BR": "Italiano",
								pl: "Włoski"
							},
							value: "it-IT"
						},
						{
							name: "Japanese",
							name_localizations: {
								fr: "Japonais",
								ja: "japanese",
								ru: "japanese",
								"es-ES": "japanese",
								ko: "일본어",
								uk: "Японська",
								de: "Japanisch",
								it: "Giapponese",
								"pt-BR": "Japonês",
								pl: "Japoński"
							},
							value: "jp-JP"
						},
						{
							name: "Korean",
							name_localizations: {
								fr: "Coréen",
								ja: "korean",
								ru: "korean",
								"es-ES": "korean",
								ko: "한국어",
								uk: "Корейська",
								de: "Koreanisch",
								it: "Coreano",
								"pt-BR": "Coreano",
								pl: "Koreański"
							},
							value: "ko-KR"
						},
						{
							name: "Portuguese",
							name_localizations: {
								fr: "Portugais",
								ja: "portuguese",
								ru: "portuguese",
								"es-ES": "portuguese",
								ko: "포르투갈어",
								uk: "Португальська",
								de: "Portugiesisch",
								it: "Portoghese",
								"pt-BR": "Português",
								pl: "Portugalski"
							},
							value: "pt-PT"
						},
						{
							name: "Russian",
							name_localizations: {
								fr: "Russe",
								ja: "russian",
								ru: "russian",
								"es-ES": "russian",
								ko: "러시아어",
								uk: "Російська",
								de: "Russisch",
								it: "Russo",
								"pt-BR": "Russo",
								pl: "Rosyjski"
							},
							value: "ru-RU"
						},
						{
							name: "Arabic",
							name_localizations: {
								fr: "Arabe",
								ja: "arabic",
								ru: "arabic",
								"es-ES": "arabic",
								ko: "아랍어",
								uk: "Арабська",
								de: "Arabisch",
								it: "Arabo",
								"pt-BR": "Árabe",
								pl: "Arabski"
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

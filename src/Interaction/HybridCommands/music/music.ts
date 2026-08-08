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

import { Command } from "../../../../types/command.js";

const VOLUMES = [
	"10",
	"20",
	"30",
	"35",
	"45",
	"55",
	"60",
	"70",
	"80",
	"90",
	"95",
	"100"
];

export const command: Command = {
	name: "music",
	name_localizations: {
		fr: "musique",
		ja: "music",
		ru: "music",
		"es-ES": "music"
	},

	description: "Subcommand for music category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de musique",
		ja: "音楽カテゴリのサブコマンド！",
		ru: "Подкоманда для категории музыки!",
		"es-ES": "Subcomando para la categoría de música!"
	},

	aliases: ["m"],

	options: [
		{
			name: "loop",
			name_localizations: {
				fr: "boucle",
				ja: "loop",
				ru: "loop",
				"es-ES": "loop"
			},

			description: "Set loop mode of the guild!",
			description_localizations: {
				fr: "Changer l'état de la boucle sur le serveur",
				ja: "サーバーのループモードを設定！",
				ru: "Установить режим повтора на сервере!",
				"es-ES": "Establecer el modo de bucle del servidor!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "mode",
					type: ApplicationCommandOptionType.String,

					description: "Loop Type",
					description_localizations: {
						fr: "Status de la boucle",
						ja: "ループタイプ",
						ru: "Тип повтора",
						"es-ES": "Tipo de bucle"
					},

					required: true,
					choices: [
						{
							name: "Off",
							name_localizations: {
								fr: "Désactiver",
								ja: "off",
								ru: "off",
								"es-ES": "off"
							},
							value: "off"
						},
						{
							name: "On",
							name_localizations: {
								fr: "Activer",
								ja: "on",
								ru: "on",
								"es-ES": "on"
							},
							value: "track"
						}
					],

					permission: null
				}
			],

			permission: null
		},
		{
			name: "lyrics",

			description: "Find the lyrics of a title!",
			description_localizations: {
				fr: "Trouver les lyrics d'un titre",
				ja: "曲の歌詞を検索！",
				ru: "Найти текст песни!",
				"es-ES": "Encontrar la letra de una canción!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "query",
					type: ApplicationCommandOptionType.String,

					description: "The track title you want",
					description_localizations: {
						fr: "Titre de la musique que vous souhaitez",
						ja: "希望するトラックのタイトル",
						ru: "Название желаемого трека",
						"es-ES": "El título de la pista que deseas"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "history",
			name_localizations: {
				fr: "historique",
				ja: "history",
				ru: "history",
				"es-ES": "history"
			},

			description:
				"See the history of all the music played in this guild!",
			description_localizations: {
				fr: "Voir toute les musique joué dans un ordre chronologique sur le serveur",
				ja: "このサーバーで再生された全音楽の履歴を表示！",
				ru: "Посмотреть историю всей музыки, воспроизведенной на сервере!",
				"es-ES": "Ver el historial de toda la música reproducida en este servidor!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "clear-queue",
			aliases: ["clearqueue"],

			description: "Clear the music queue in this guild!",
			description_localizations: {
				fr: "Vider la file d'attente musicale de ce serveur",
				ja: "このサーバーの音楽キューをクリア！",
				ru: "Очистить музыкальную очередь на сервере!",
				"es-ES": "Limpiar la cola de música en este servidor!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "nowplaying",
			name_localizations: {
				fr: "en-lecture",
				ja: "nowplaying",
				ru: "nowplaying",
				"es-ES": "nowplaying"
			},

			description: "Get the current playing song!",
			description_localizations: {
				fr: "Obtenir la chanson en cours de lecture",
				ja: "現在再生中の曲を取得！",
				ru: "Получить текущую песню!",
				"es-ES": "Obtener la canción actual!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "pause",

			description: "Pause the current playing song!",
			description_localizations: {
				fr: "Mettre en pause la musique actuelle",
				ja: "現在再生中の曲を一時停止！",
				ru: "Поставить текущую песню на паузу!",
				"es-ES": "Pausar la canción actual!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "play",

			description: "Play a song!",
			description_localizations: {
				fr: "Jouer une musique!",
				ja: "曲を再生！",
				ru: "Воспроизвести песню!",
				"es-ES": "Reproducir una canción!"
			},

			aliases: ["p"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "title",
					type: ApplicationCommandOptionType.String,

					description:
						"The track title you want (you can put URL as you want)",
					description_localizations: {
						fr: "Titre de la musique que vous souhaitez (vous pouvez mettre une URL si vous le voulez)",
						ja: "希望するトラックタイトル（URLでも可）",
						ru: "Название трека (можно указать URL)",
						"es-ES": "El título de la pista que deseas (puedes poner URL como quieras)"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "volume",

			description: "change the volume of the player in the guild",
			description_localizations: {
				fr: "changer le son du player sur le serveur",
				ja: "サーバーのプレイヤーの音量を変更",
				ru: "изменить громкость плеера на сервере",
				"es-ES": "cambiar el volumen del reproductor en el servidor"
			},

			permission: null,

			options: [
				{
					name: "level",

					description: "the music level",
					description_localizations: {
						fr: "le niveau du son",
						ja: "音楽レベル",
						ru: "уровень музыки",
						"es-ES": "el nivel de música"
					},

					choices: VOLUMES.map((x) => {
						return {
							name: x + "%",
							name_localizations: { fr: x + "%", ja: x + "%", ru: x + "%", "es-ES": x + "%" },
							value: x
						};
					}),

					required: true,
					type: ApplicationCommandOptionType.String,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "trackinfo",

			description: "Search a music into the Internet",
			description_localizations: {
				fr: "Chercher une musique sur Internet",
				ja: "インターネットで音楽を検索",
				ru: "Искать музыку в интернете",
				"es-ES": "Buscar música en Internet"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "queue",

			description: "Get the queue!",
			description_localizations: {
				fr: "Obtenir la file d'attente des musique sur le serveur!",
				ja: "キューを取得！",
				ru: "Получить очередь!",
				"es-ES": "Obtener la cola!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "resume",
			name_localizations: {
				fr: "reprendre",
				ja: "resume",
				ru: "resume",
				"es-ES": "resume"
			},

			aliases: ["unpause"],

			description: "Resume the current playing song!",
			description_localizations: {
				fr: "Reprendre la chanson en cours de lecture",
				ja: "現在再生中の曲を再開！",
				ru: "Возобновить текущую песню!",
				"es-ES": "Reanudar la canción actual!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "shuffle",
			name_localizations: {
				fr: "mélanger",
				ja: "shuffle",
				ru: "shuffle",
				"es-ES": "shuffle"
			},

			description: "Shuffle the queue!",
			description_localizations: {
				fr: "Mélangez la file d'attente",
				ja: "キューをシャッフル！",
				ru: "Перемешать очередь!",
				"es-ES": "Mezclar la cola!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "skip",

			description: "Skip the current playing song!",
			description_localizations: {
				fr: "Passer la chanson en cours de lecture",
				ja: "現在再生中の曲をスキップ！",
				ru: "Пропустить текущую песню!",
				"es-ES": "Saltar la canción actual!"
			},

			aliases: ["next"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "stop",

			description: "Stop the current playing song!",
			description_localizations: {
				fr: "Couper la musique",
				ja: "現在再生中の曲を停止！",
				ru: "Остановить текущую песню!",
				"es-ES": "Detener la canción actual!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		}
	],
	thinking: true,
	category: "music",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

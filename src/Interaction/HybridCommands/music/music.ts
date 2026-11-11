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
import { musicTrackAutocomplete } from "../../../core/modules/musicAutocomplete.js";

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
		"es-ES": "music",
		ko: "music"
	},

	description: "Subcommand for music category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de musique",
		ja: "音楽カテゴリのサブコマンド！",
		ru: "Подкоманда для категории музыки!",
		"es-ES": "Subcomando para la categoría de música!",
		ko: "음악 하위 명령어!"
	},

	aliases: ["m"],

	options: [
		{
			name: "apo",

			description:
				"Manage the server's Equalizer APO configs (administrators)!",
			description_localizations: {
				fr: "Gérer les configs Equalizer APO du serveur (administrateurs)",
				ja: "サーバーのEqualizer APO設定を管理（管理者）！",
				ru: "Управлять конфигурациями Equalizer APO сервера (администраторы)!",
				"es-ES":
					"Gestionar las configuraciones Equalizer APO del servidor (administradores)!",
				ko: "서버의 Equalizer APO 설정을 관리해요 (관리자)!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "file",
					name_localizations: {
						fr: "fichier",
						ja: "file",
						ru: "file",
						"es-ES": "archivo",
						ko: "file"
					},
					type: ApplicationCommandOptionType.Attachment,

					description:
						"Equalizer APO configuration (.txt) to add to the server's configs",
					description_localizations: {
						fr: "Configuration Equalizer APO (.txt) à ajouter aux configs du serveur",
						ja: "サーバーの設定に追加するEqualizer APOファイル（.txt）",
						ru: "Конфигурация Equalizer APO (.txt) для добавления на сервер",
						"es-ES":
							"Configuración de Equalizer APO (.txt) para añadir al servidor",
						ko: "서버 설정에 추가할 Equalizer APO 설정 파일(.txt)"
					},

					required: false,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "loop",
			name_localizations: {
				fr: "boucle",
				ja: "loop",
				ru: "loop",
				"es-ES": "loop",
				ko: "loop"
			},

			description: "Set loop mode of the guild!",
			description_localizations: {
				fr: "Changer l'état de la boucle sur le serveur",
				ja: "サーバーのループモードを設定！",
				ru: "Установить режим повтора на сервере!",
				"es-ES": "Establecer el modo de bucle del servidor!",
				ko: "서버의 반복 모드를 설정해요!"
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
						"es-ES": "Tipo de bucle",
						ko: "반복 유형"
					},

					required: true,
					choices: [
						{
							name: "Off",
							name_localizations: {
								fr: "Désactiver",
								ja: "off",
								ru: "off",
								"es-ES": "off",
								ko: "끄기"
							},
							value: "off"
						},
						{
							name: "On",
							name_localizations: {
								fr: "Activer",
								ja: "on",
								ru: "on",
								"es-ES": "on",
								ko: "켜기"
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
				"es-ES": "Encontrar la letra de una canción!",
				ko: "곡의 가사를 찾아요!"
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
						"es-ES": "El título de la pista que deseas",
						ko: "원하는 곡 제목"
					},

					required: true,
					autocomplete: true,

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
				"es-ES": "history",
				ko: "history"
			},

			description:
				"See the history of all the music played in this guild!",
			description_localizations: {
				fr: "Voir toute les musique joué dans un ordre chronologique sur le serveur",
				ja: "このサーバーで再生された全音楽の履歴を表示！",
				ru: "Посмотреть историю всей музыки, воспроизведенной на сервере!",
				"es-ES":
					"Ver el historial de toda la música reproducida en este servidor!",
				ko: "이 서버에서 재생된 모든 음악 기록을 확인해요!"
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
				"es-ES": "Limpiar la cola de música en este servidor!",
				ko: "이 서버의 음악 대기열을 비워요!"
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
				"es-ES": "nowplaying",
				ko: "nowplaying"
			},

			description: "Get the current playing song!",
			description_localizations: {
				fr: "Obtenir la chanson en cours de lecture",
				ja: "現在再生中の曲を取得！",
				ru: "Получить текущую песню!",
				"es-ES": "Obtener la canción actual!",
				ko: "지금 재생 중인 곡을 확인해요!"
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
				"es-ES": "Pausar la canción actual!",
				ko: "지금 재생 중인 곡을 일시정지해요!"
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
				"es-ES": "Reproducir una canción!",
				ko: "곡을 재생해요!"
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
						"es-ES":
							"El título de la pista que deseas (puedes poner URL como quieras)",
						ko: "원하는 곡 제목 (URL도 가능)"
					},

					required: true,
					autocomplete: true,

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
				"es-ES": "cambiar el volumen del reproductor en el servidor",
				ko: "서버 플레이어의 볼륨을 변경해요"
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
						"es-ES": "el nivel de música",
						ko: "음악 볼륨"
					},

					choices: VOLUMES.map((x) => {
						return {
							name: x + "%",
							name_localizations: {
								fr: x + "%",
								ja: x + "%",
								ru: x + "%",
								"es-ES": x + "%",
								ko: x + "%"
							},
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
				"es-ES": "Buscar música en Internet",
				ko: "인터넷에서 음악을 검색해요"
			},

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "title",
					type: ApplicationCommandOptionType.String,

					description:
						"The track title or URL (empty: the track playing now)",
					description_localizations: {
						fr: "Titre ou URL de la musique (vide : celle en cours de lecture)",
						ja: "曲名またはURL（空欄：再生中の曲）",
						ru: "Название или URL трека (пусто: текущий трек)",
						"es-ES":
							"Título o URL de la pista (vacío: la que suena ahora)",
						ko: "곡 제목 또는 URL (비우면 지금 재생 중인 곡)"
					},

					required: false,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "queue",

			description: "Get the queue!",
			description_localizations: {
				fr: "Obtenir la file d'attente des musique sur le serveur!",
				ja: "キューを取得！",
				ru: "Получить очередь!",
				"es-ES": "Obtener la cola!",
				ko: "대기열을 확인해요!"
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
				"es-ES": "resume",
				ko: "resume"
			},

			aliases: ["unpause"],

			description: "Resume the current playing song!",
			description_localizations: {
				fr: "Reprendre la chanson en cours de lecture",
				ja: "現在再生中の曲を再開！",
				ru: "Возобновить текущую песню!",
				"es-ES": "Reanudar la canción actual!",
				ko: "현재 곡을 다시 재생해요!"
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
				"es-ES": "shuffle",
				ko: "shuffle"
			},

			description: "Shuffle the queue!",
			description_localizations: {
				fr: "Mélangez la file d'attente",
				ja: "キューをシャッフル！",
				ru: "Перемешать очередь!",
				"es-ES": "Mezclar la cola!",
				ko: "대기열을 셔플해요!"
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
				"es-ES": "Saltar la canción actual!",
				ko: "지금 재생 중인 곡을 건너뛰어요!"
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
				"es-ES": "Detener la canción actual!",
				ko: "지금 재생 중인 곡을 정지해요!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		}
	],
	thinking: true,
	category: "music",
	type: ApplicationCommandType.ChatInput,
	permission: null,
	async autocomplete(client, interaction) {
		// Track suggestions: /music play `title` and /music lyrics `query`.
		const sub = interaction.options.getSubcommand(false);
		const focused = interaction.options.getFocused(true).name;
		if (
			(sub === "play" && focused === "title") ||
			(sub === "lyrics" && focused === "query")
		) {
			await musicTrackAutocomplete(client, interaction);
		}
	}
};

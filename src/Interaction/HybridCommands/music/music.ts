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
import { musicLibraryAutocomplete } from "../../../core/modules/musicLibraryPanel.js";

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
		ko: "music",
		uk: "music",
		de: "music",
		it: "music",
		"pt-BR": "music",
		pl: "music"
	},

	description: "Subcommand for music category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de musique",
		ja: "音楽カテゴリのサブコマンド！",
		ru: "Подкоманда для категории музыки!",
		"es-ES": "Subcomando para la categoría de música!",
		ko: "음악 하위 명령어!",
		uk: "Підкоманда категорії музики!",
		de: "Unterbefehle der Musik-Kategorie!",
		it: "Sottocomandi della categoria musica!",
		"pt-BR": "Subcomandos da categoria música!",
		pl: "Podkomendy kategorii muzyki!"
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
				ko: "서버의 Equalizer APO 설정을 관리해요 (관리자)!",
				uk: "Керувати конфігураціями Equalizer APO сервера (адміністратори)!",
				de: "Equalizer-APO-Konfigs des Servers verwalten (Admins)!",
				it: "Gestisci le configurazioni Equalizer APO del server (admin)!",
				"pt-BR":
					"Gerencie as configurações do Equalizer APO do servidor (admins)!",
				pl: "Zarządzaj konfiguracjami Equalizer APO serwera (administratorzy)!"
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
						ko: "file",
						uk: "file",
						de: "file",
						it: "file",
						"pt-BR": "file",
						pl: "file"
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
						ko: "서버 설정에 추가할 Equalizer APO 설정 파일(.txt)",
						uk: "Конфігурація Equalizer APO (.txt), яку слід додати до конфігурацій сервера",
						de: "Equalizer-APO-Konfiguration (.txt) für die Server-Konfigs",
						it: "Configurazione Equalizer APO (.txt) da aggiungere a quelle del server",
						"pt-BR":
							"Configuração do Equalizer APO (.txt) para adicionar às do servidor",
						pl: "Konfiguracja Equalizer APO (.txt) do dodania do konfiguracji serwera"
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
				ko: "loop",
				uk: "loop",
				de: "loop",
				it: "loop",
				"pt-BR": "loop",
				pl: "loop"
			},

			description: "Set loop mode of the guild!",
			description_localizations: {
				fr: "Changer l'état de la boucle sur le serveur",
				ja: "サーバーのループモードを設定！",
				ru: "Установить режим повтора на сервере!",
				"es-ES": "Establecer el modo de bucle del servidor!",
				ko: "서버의 반복 모드를 설정해요!",
				uk: "Встановити режим повтору на сервері!",
				de: "Legt den Wiederholungsmodus des Servers fest!",
				it: "Imposta la modalità ripetizione del server!",
				"pt-BR": "Define o modo de repetição do servidor!",
				pl: "Ustawia tryb zapętlenia serwera!"
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
						ko: "반복 유형",
						uk: "Тип повтору",
						de: "Wiederholungsart",
						it: "Tipo di ripetizione",
						"pt-BR": "Tipo de repetição",
						pl: "Typ powtarzania"
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
								ko: "끄기",
								uk: "Вимкнено",
								de: "Aus",
								it: "Off",
								"pt-BR": "Desligado",
								pl: "Wył."
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
								ko: "켜기",
								uk: "Увімкнено",
								de: "An",
								it: "On",
								"pt-BR": "Ligado",
								pl: "Wł."
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
				ko: "곡의 가사를 찾아요!",
				uk: "Знайти текст пісні!",
				de: "Finde den Songtext eines Titels!",
				it: "Trova il testo di un brano!",
				"pt-BR": "Encontre a letra de uma música!",
				pl: "Znajdź tekst utworu!"
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
						ko: "원하는 곡 제목",
						uk: "Назва треку, який ви шукаєте",
						de: "Der gewünschte Track-Titel",
						it: "Il titolo del brano che vuoi",
						"pt-BR": "O título da faixa que você quer",
						pl: "Tytuł wybranego utworu"
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
				ko: "history",
				uk: "history",
				de: "history",
				it: "history",
				"pt-BR": "history",
				pl: "history"
			},

			description:
				"See the history of all the music played in this guild!",
			description_localizations: {
				fr: "Voir toute les musique joué dans un ordre chronologique sur le serveur",
				ja: "このサーバーで再生された全音楽の履歴を表示！",
				ru: "Посмотреть историю всей музыки, воспроизведенной на сервере!",
				"es-ES":
					"Ver el historial de toda la música reproducida en este servidor!",
				ko: "이 서버에서 재생된 모든 음악 기록을 확인해요!",
				uk: "Переглянути історію всієї музики, що грала на цьому сервері!",
				de: "Zeigt den Verlauf aller auf diesem Server gespielten Musik!",
				it: "Mostra la cronologia di tutta la musica riprodotta nel server!",
				"pt-BR":
					"Mostra o histórico de todas as músicas tocadas neste servidor!",
				pl: "Pokazuje historię całej muzyki odtworzonej na tym serwerze!"
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
				ko: "이 서버의 음악 대기열을 비워요!",
				uk: "Очистити чергу музики на цьому сервері!",
				de: "Leere die Musikwarteschlange auf diesem Server!",
				it: "Svuota la coda musicale di questo server!",
				"pt-BR": "Limpe a fila de música deste servidor!",
				pl: "Wyczyść kolejkę muzyki na tym serwerze!"
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
				ko: "nowplaying",
				uk: "nowplaying",
				de: "nowplaying",
				it: "nowplaying",
				"pt-BR": "nowplaying",
				pl: "nowplaying"
			},

			description: "Get the current playing song!",
			description_localizations: {
				fr: "Obtenir la chanson en cours de lecture",
				ja: "現在再生中の曲を取得！",
				ru: "Получить текущую песню!",
				"es-ES": "Obtener la canción actual!",
				ko: "지금 재생 중인 곡을 확인해요!",
				uk: "Показати пісню, що зараз грає!",
				de: "Zeige den aktuell laufenden Song!",
				it: "Ottieni il brano in riproduzione!",
				"pt-BR": "Veja a música tocando agora!",
				pl: "Pokaż aktualnie odtwarzany utwór!"
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
				ko: "지금 재생 중인 곡을 일시정지해요!",
				uk: "Призупинити пісню, що зараз грає!",
				de: "Pausiere den aktuellen Song!",
				it: "Metti in pausa il brano in riproduzione!",
				"pt-BR": "Pause a música atual!",
				pl: "Wstrzymaj aktualnie odtwarzany utwór!"
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
				ko: "곡을 재생해요!",
				uk: "Відтворити пісню!",
				de: "Spiele einen Song ab!",
				it: "Riproduci un brano!",
				"pt-BR": "Toque uma música!",
				pl: "Odtwórz utwór!"
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
						ko: "원하는 곡 제목 (URL도 가능)",
						uk: "Назва треку, який ви шукаєте (можна вказати URL)",
						de: "Der gewünschte Track-Titel (auch eine URL ist möglich)",
						it: "Il titolo del brano che vuoi (puoi usare anche un URL)",
						"pt-BR":
							"O título da faixa que você quer (pode usar uma URL)",
						pl: "Tytuł utworu (możesz podać też URL)"
					},

					required: true,
					autocomplete: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "playlist",

			description: "See your playlists and liked tracks!",
			description_localizations: {
				fr: "Voir tes playlists et tes titres likés !",
				ja: "プレイリストとお気に入りの曲を見る！",
				ru: "Посмотреть свои плейлисты и любимые треки!",
				"es-ES": "¡Mira tus playlists y tus canciones favoritas!",
				ko: "내 플레이리스트와 좋아요 표시한 곡을 봐요!",
				uk: "Переглянути свої плейлисти та вподобані треки!",
				de: "Sieh dir deine Playlists und Lieblingssongs an!",
				it: "Guarda le tue playlist e i tuoi brani preferiti!",
				"pt-BR": "Veja suas playlists e músicas favoritas!",
				pl: "Zobacz swoje playlisty i polubione utwory!"
			},

			aliases: ["playlists", "library"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "name",
					type: ApplicationCommandOptionType.String,

					description: "A playlist to open directly",
					description_localizations: {
						fr: "Une playlist à ouvrir directement",
						ja: "直接開くプレイリスト",
						ru: "Плейлист, который нужно сразу открыть",
						"es-ES": "Una playlist para abrir directamente",
						ko: "바로 열 플레이리스트",
						uk: "Плейлист, який відкрити одразу",
						de: "Eine Playlist, die direkt geöffnet wird",
						it: "Una playlist da aprire subito",
						"pt-BR": "Uma playlist para abrir direto",
						pl: "Playlista do otwarcia od razu"
					},

					required: false,
					autocomplete: true,

					permission: null
				}
			],
			ephemeral: true,

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
				ko: "서버 플레이어의 볼륨을 변경해요",
				uk: "Змінити гучність програвача на сервері",
				de: "Ändert die Lautstärke des Players auf dem Server",
				it: "Cambia il volume del player nel server",
				"pt-BR": "Altera o volume do player no servidor",
				pl: "Zmienia głośność odtwarzacza na serwerze"
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
						ko: "음악 볼륨",
						uk: "Рівень гучності",
						de: "Die Musiklautstärke",
						it: "Il livello della musica",
						"pt-BR": "O nível da música",
						pl: "Poziom głośności muzyki"
					},

					choices: VOLUMES.map((x) => {
						return {
							name: x + "%",
							name_localizations: {
								fr: x + "%",
								ja: x + "%",
								ru: x + "%",
								"es-ES": x + "%",
								ko: x + "%",
								uk: x + "%",
								de: x + "%",
								it: x + "%",
								"pt-BR": x + "%",
								pl: x + "%"
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
				ko: "인터넷에서 음악을 검색해요",
				uk: "Знайти музику в інтернеті",
				de: "Sucht Musik im Internet",
				it: "Cerca una musica su Internet",
				"pt-BR": "Busca uma música na internet",
				pl: "Wyszukuje muzykę w internecie"
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
						ko: "곡 제목 또는 URL (비우면 지금 재생 중인 곡)",
						uk: "Назва треку або URL (порожньо: трек, що грає зараз)",
						de: "Titel oder URL des Tracks (leer: aktueller Track)",
						it: "Titolo o URL del brano (vuoto: quello in riproduzione)",
						"pt-BR":
							"Título ou URL da faixa (vazio: a que está tocando)",
						pl: "Tytuł lub URL utworu (puste: aktualny utwór)"
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
				ko: "대기열을 확인해요!",
				uk: "Показати чергу!",
				de: "Zeige die Warteschlange!",
				it: "Ottieni la coda!",
				"pt-BR": "Veja a fila!",
				pl: "Pokaż kolejkę!"
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
				ko: "resume",
				uk: "resume",
				de: "resume",
				it: "resume",
				"pt-BR": "resume",
				pl: "resume"
			},

			aliases: ["unpause"],

			description: "Resume the current playing song!",
			description_localizations: {
				fr: "Reprendre la chanson en cours de lecture",
				ja: "現在再生中の曲を再開！",
				ru: "Возобновить текущую песню!",
				"es-ES": "Reanudar la canción actual!",
				ko: "현재 곡을 다시 재생해요!",
				uk: "Відновити пісню, що зараз грає!",
				de: "Setzt den aktuellen Song fort!",
				it: "Riprendi la canzone in riproduzione!",
				"pt-BR": "Retoma a música que está tocando!",
				pl: "Wznawia aktualnie odtwarzany utwór!"
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
				ko: "shuffle",
				uk: "shuffle",
				de: "shuffle",
				it: "shuffle",
				"pt-BR": "shuffle",
				pl: "shuffle"
			},

			description: "Shuffle the queue!",
			description_localizations: {
				fr: "Mélangez la file d'attente",
				ja: "キューをシャッフル！",
				ru: "Перемешать очередь!",
				"es-ES": "Mezclar la cola!",
				ko: "대기열을 셔플해요!",
				uk: "Перемішати чергу!",
				de: "Mischt die Warteschlange!",
				it: "Mescola la coda!",
				"pt-BR": "Embaralha a fila!",
				pl: "Tasuje kolejkę!"
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
				ko: "지금 재생 중인 곡을 건너뛰어요!",
				uk: "Пропустити пісню, що зараз грає!",
				de: "Überspringt den aktuellen Song!",
				it: "Salta la canzone in riproduzione!",
				"pt-BR": "Pula a música que está tocando!",
				pl: "Pomija aktualnie odtwarzany utwór!"
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
				ko: "지금 재생 중인 곡을 정지해요!",
				uk: "Зупинити пісню, що зараз грає!",
				de: "Stoppt den aktuellen Song!",
				it: "Ferma la canzone in riproduzione!",
				"pt-BR": "Para a música que está tocando!",
				pl: "Zatrzymuje aktualnie odtwarzany utwór!"
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
		} else if (sub === "playlist" && focused === "name") {
			await musicLibraryAutocomplete(client, interaction);
		}
	}
};

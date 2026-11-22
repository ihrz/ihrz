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

export const command: Command = {
	name: "backup",

	description: "Subcommand for backup category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie backup",
		ja: "バックアップカテゴリのサブコマンド！",
		ru: "Подкоманда для категории резервного копирования!",
		"es-ES": "Subcomando para la categoría de copias de seguridad!",
		ko: "백업 하위 명령어!",
		uk: "Підкоманда категорії резервного копіювання!",
		de: "Unterbefehle der Backup-Kategorie!",
		it: "Sottocomandi della categoria backup!",
		"pt-BR": "Subcomandos da categoria backup!",
		pl: "Podkomendy kategorii kopii zapasowych!"
	},

	options: [
		{
			name: "create",
			prefixName: "backup-create",

			name_localizations: {
				fr: "créer",
				ja: "create",
				ru: "create",
				"es-ES": "create",
				ko: "create",
				uk: "create",
				de: "create",
				it: "create",
				"pt-BR": "create",
				pl: "create"
			},

			aliases: ["bcreate"],

			description: "Create a backup!",
			description_localizations: {
				fr: "Créer une backup",
				ja: "バックアップを作成！",
				ru: "Создать резервную копию!",
				"es-ES": "Crear una copia de seguridad!",
				ko: "백업을 만들어요!",
				uk: "Створити резервну копію!",
				de: "Erstelle ein Backup!",
				it: "Crea un backup!",
				"pt-BR": "Crie um backup!",
				pl: "Utwórz kopię zapasową!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "list",
			name_localizations: {
				fr: "listé",
				ja: "list",
				ru: "list",
				"es-ES": "list",
				ko: "list",
				uk: "list",
				de: "list",
				it: "list",
				"pt-BR": "list",
				pl: "list"
			},
			prefixName: "backup-list",

			description: "List your backup(s)!",
			description_localizations: {
				fr: "Listé toute vos backup(s)",
				ja: "バックアップを一覧表示！",
				ru: "Показать ваши резервные копии!",
				"es-ES": "Listar tus copias de seguridad!",
				ko: "내 백업 목록을 확인해요!",
				uk: "Показати ваші резервні копії!",
				de: "Deine Backups auflisten!",
				it: "Elenca i tuoi backup!",
				"pt-BR": "Liste seus backups!",
				pl: "Wyświetl swoje kopie zapasowe!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "load",
			name_localizations: {
				fr: "chargé",
				ja: "load",
				ru: "load",
				"es-ES": "load",
				ko: "load",
				uk: "load",
				de: "load",
				it: "load",
				"pt-BR": "load",
				pl: "load"
			},
			prefixName: "backup-load",

			description: "Load your backup to initialize!",
			description_localizations: {
				fr: "Charger une de vos backup(s)",
				ja: "バックアップを読み込んで初期化！",
				ru: "Загрузить резервную копию для инициализации!",
				"es-ES": "Cargar tu copia de seguridad para inicializar!",
				ko: "백업을 불러와 서버를 초기화해요!",
				uk: "Завантажити резервну копію для ініціалізації!",
				de: "Lade dein Backup zur Initialisierung!",
				it: "Carica il tuo backup per inizializzare!",
				"pt-BR": "Carregue seu backup para inicializar!",
				pl: "Wczytaj kopię zapasową, aby zainicjować!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "backup-id",
					type: ApplicationCommandOptionType.String,

					description: "Whats is the backup id?",
					description_localizations: {
						fr: "Quelle est l'identifiant de la backup ?",
						ja: "バックアップIDは？",
						ru: "Какой ID резервной копии?",
						"es-ES": "Cual es el ID de la copia de seguridad?",
						ko: "백업 ID는 무엇인가요?",
						uk: "Який ID резервної копії?",
						de: "Wie lautet die Backup-ID?",
						it: "Qual è l'ID del backup?",
						"pt-BR": "Qual é o ID do backup?",
						pl: "Jakie jest ID kopii zapasowej?"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "delete",
			prefixName: "backup-delete",

			description: "Delete your backup from the list",
			description_localizations: {
				fr: "Supprimer une backup de la liste",
				ja: "リストからバックアップを削除",
				ru: "Удалить резервную копию из списка",
				"es-ES": "Eliminar tu copia de seguridad de la lista",
				ko: "목록에서 백업을 삭제해요",
				uk: "Видалити резервну копію зі списку",
				de: "Lösche dein Backup aus der Liste",
				it: "Elimina il tuo backup dall'elenco",
				"pt-BR": "Exclua seu backup da lista",
				pl: "Usuń swoją kopię zapasową z listy"
			},

			options: [
				{
					name: "backup-id",

					description:
						"The ID of your backup you want to delete from the list",
					description_localizations: {
						fr: "L'identifiant de la backup que vous voulez supprimer de la liste",
						ja: "リストから削除したいバックアップのID",
						ru: "ID резервной копии, которую вы хотите удалить из списка",
						"es-ES":
							"El ID de tu copia de seguridad que quieres eliminar de la lista",
						ko: "목록에서 삭제할 백업 ID",
						uk: "ID резервної копії, яку ви хочете видалити зі списку",
						de: "ID des Backups, das du aus der Liste löschen willst",
						it: "ID del backup da eliminare dall'elenco",
						"pt-BR": "ID do backup que você quer excluir da lista",
						pl: "ID kopii zapasowej do usunięcia z listy"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "schedule",
			prefixName: "backup-schedule",

			description: "Back up this server automatically on a schedule",
			description_localizations: {
				fr: "Sauvegarder ce serveur automatiquement selon un planning",
				ja: "スケジュールでこのサーバーを自動バックアップ",
				ru: "Автоматически создавать резервные копии по расписанию",
				"es-ES": "Hacer copias de este servidor automáticamente",
				ko: "일정에 따라 이 서버를 자동으로 백업해요",
				uk: "Автоматично створювати резервні копії сервера за розкладом",
				de: "Diesen Server automatisch nach Zeitplan sichern",
				it: "Esegui il backup di questo server automaticamente a intervalli",
				"pt-BR":
					"Faça backup deste servidor automaticamente em intervalos",
				pl: "Automatycznie twórz kopię zapasową serwera według harmonogramu"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "manage",
			prefixName: "backup-manager",

			description: "Manage the backup system into this guild",
			description_localizations: {
				fr: "Gérer le système de backup sur le serveur",
				ja: "このサーバーのバックアップシステムを管理",
				ru: "Управление системой резервного копирования",
				"es-ES":
					"Gestionar el sistema de copias de seguridad en este servidor",
				ko: "이 서버의 백업 시스템 관리",
				uk: "Керування системою резервного копіювання на сервері",
				de: "Backup-System dieses Servers verwalten",
				it: "Gestisci il sistema di backup di questo server",
				"pt-BR": "Gerencie o sistema de backup deste servidor",
				pl: "Zarządzaj systemem kopii zapasowych tego serwera"
			},

			permission: null,
			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "only_guild_owner",

					description:
						"Make the backup system only working for guild owner",
					description_localizations: {
						fr: "Faire fonctionner le système de backup uniquement pour le propriétaire du serveur discord.",
						ja: "バックアップシステムをサーバーオーナーのみに制限",
						ru: "Сделать систему резервного копирования доступной только владельцу сервера",
						"es-ES":
							"Hacer que el sistema de copias de seguridad solo funcione para el propietario del servidor",
						ko: "백업 시스템을 서버 소유자만 쓸 수 있게 해요",
						uk: "Зробити систему резервного копіювання доступною лише власнику сервера",
						de: "Backup-System nur für den Serverbesitzer nutzbar machen",
						it: "Rendi il sistema di backup utilizzabile solo dal proprietario del server",
						"pt-BR":
							"Deixe o sistema de backup disponível só para o dono do servidor",
						pl: "Udostępnij system kopii zapasowych tylko właścicielowi serwera"
					},

					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Only owner",
							name_localizations: {
								fr: "Seulement le propriétaire",
								ja: "only_owner",
								ru: "only_owner",
								"es-ES": "only_owner",
								ko: "소유자만",
								uk: "Лише власник",
								de: "Nur Besitzer",
								it: "Solo proprietario",
								"pt-BR": "Apenas o dono",
								pl: "Tylko właściciel"
							},
							value: "owner"
						},
						{
							name: "All admin(s)",
							name_localizations: {
								fr: "Tous les administrateurs",
								ja: "all_admin_s",
								ru: "all_admin_s",
								"es-ES": "all_admin_s",
								ko: "모든 관리자",
								uk: "Усі адміністратори",
								de: "Alle Admins",
								it: "Tutti gli admin",
								"pt-BR": "Todos os admins",
								pl: "Wszyscy administratorzy"
							},
							value: "admin"
						}
					],

					required: true,
					permission: null
				}
			]
		}
	],
	category: "backup",
	thinking: true,
	type: ApplicationCommandType.ChatInput,
	permission: null
};

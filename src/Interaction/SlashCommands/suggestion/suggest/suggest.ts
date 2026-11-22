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

import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "suggest",

	description: "Subcommand for suggestion category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de suggestion",
		ja: "提案カテゴリのサブコマンド！",
		ru: "Подкоманда для категории предложений!",
		"es-ES": "Subcomando para la categoría de sugerencias!",
		ko: "건의 하위 명령어!",
		uk: "Підкоманда для категорії пропозицій!",
		de: "Unterbefehle der Vorschlags-Kategorie!",
		it: "Sottocomandi della categoria suggerimenti!",
		"pt-BR": "Subcomandos da categoria sugestões!",
		pl: "Podkomendy kategorii sugestii!"
	},

	options: [
		{
			name: "reply",
			name_localizations: {
				fr: "répondre",
				ja: "reply",
				ru: "reply",
				"es-ES": "reply",
				ko: "reply",
				uk: "reply",
				de: "reply",
				it: "reply",
				"pt-BR": "reply",
				pl: "reply"
			},
			prefixName: "sug-reply",

			description: "Reply to the suggestion!",
			description_localizations: {
				fr: "Répondre à la suggestion",
				ja: "提案に返信！",
				ru: "Ответить на предложение!",
				"es-ES": "Responder a la sugerencia!",
				ko: "건의에 답장해요!",
				uk: "Відповісти на пропозицію!",
				de: "Antworte auf den Vorschlag!",
				it: "Rispondi al suggerimento!",
				"pt-BR": "Responda à sugestão!",
				pl: "Odpowiedz na sugestię!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?",
						ko: "건의 ID는 무엇인가요?",
						uk: "Який ID пропозиції?",
						de: "Wie lautet die ID des Vorschlags?",
						it: "Qual è l'ID del suggerimento?",
						"pt-BR": "Qual é o ID da sugestão?",
						pl: "Jakie jest ID sugestii?"
					},

					required: true,

					permission: null
				},
				{
					name: "message",
					type: ApplicationCommandOptionType.String,

					description: "What message you want reply?",
					description_localizations: {
						fr: "Quelle message vous voulez laissez à la suggestion",
						ja: "どのメッセージに返信しますか？",
						ru: "На какое сообщение вы хотите ответить?",
						"es-ES": "A qué mensaje quieres responder?",
						ko: "어떤 메시지로 답장할까요?",
						uk: "Яке повідомлення-відповідь?",
						de: "Auf welche Nachricht willst du antworten?",
						it: "A quale messaggio vuoi rispondere?",
						"pt-BR": "A qual mensagem você quer responder?",
						pl: "Na którą wiadomość chcesz odpowiedzieć?"
					},

					required: true,

					permission: null
				}
			],

			ephemeral: true,
			permission: null
		},
		{
			name: "deny",
			name_localizations: {
				fr: "refusé",
				ja: "deny",
				ru: "deny",
				"es-ES": "deny",
				ko: "deny",
				uk: "deny",
				de: "deny",
				it: "deny",
				"pt-BR": "deny",
				pl: "deny"
			},
			prefixName: "sug-deny",

			description: "Deny an suggestion!",
			description_localizations: {
				fr: "Refuser une suggestion (Requière les permission Admin)",
				ja: "提案を拒否！",
				ru: "Отклонить предложение!",
				"es-ES": "Denegar una sugerencia!",
				ko: "건의를 거절해요!",
				uk: "Відхилити пропозицію!",
				de: "Lehne einen Vorschlag ab!",
				it: "Rifiuta un suggerimento!",
				"pt-BR": "Recuse uma sugestão!",
				pl: "Odrzuć sugestię!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?",
						ko: "건의 ID는 무엇인가요?",
						uk: "Який ID пропозиції?",
						de: "Wie lautet die ID des Vorschlags?",
						it: "Qual è l'ID del suggerimento?",
						"pt-BR": "Qual é o ID da sugestão?",
						pl: "Jakie jest ID sugestii?"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					name_localizations: {
						fr: "raison",
						ja: "reason",
						ru: "reason",
						"es-ES": "reason",
						ko: "reason",
						uk: "reason",
						de: "reason",
						it: "reason",
						"pt-BR": "reason",
						pl: "reason"
					},

					type: ApplicationCommandOptionType.String,

					description: "What reason for you denying ?",
					description_localizations: {
						fr: "Quelle message vous voulez laissez à la suggestion",
						ja: "拒否する理由は？",
						ru: "Причина отказа?",
						"es-ES": "Que razón tienes para denegar?",
						ko: "거절 사유는 무엇인가요?",
						uk: "Яка причина відхилення?",
						de: "Aus welchem Grund lehnst du ab?",
						it: "Qual è il motivo del rifiuto?",
						"pt-BR": "Qual é o motivo da recusa?",
						pl: "Jaki jest powód odrzucenia?"
					},

					required: true,

					permission: null
				}
			],

			ephemeral: true,
			permission: null
		},
		{
			name: "accept",
			name_localizations: {
				fr: "accepté",
				ja: "accept",
				ru: "accept",
				"es-ES": "accept",
				ko: "accept",
				uk: "accept",
				de: "accept",
				it: "accept",
				"pt-BR": "accept",
				pl: "accept"
			},
			prefixName: "sug-accept",

			description: "Accept an suggestion!",
			description_localizations: {
				fr: "Accepter une suggestion (Requiert permissions Admin)",
				ja: "提案を承認！",
				ru: "Принять предложение!",
				"es-ES": "Aceptar una sugerencia!",
				ko: "건의를 수락해요!",
				uk: "Прийняти пропозицію!",
				de: "Nimm einen Vorschlag an!",
				it: "Accetta un suggerimento!",
				"pt-BR": "Aceite uma sugestão!",
				pl: "Zaakceptuj sugestię!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?",
						ko: "건의 ID는 무엇인가요?",
						uk: "Який ID пропозиції?",
						de: "Wie lautet die ID des Vorschlags?",
						it: "Qual è l'ID del suggerimento?",
						"pt-BR": "Qual é o ID da sugestão?",
						pl: "Jakie jest ID sugestii?"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					name_localizations: {
						fr: "raison",
						ja: "reason",
						ru: "reason",
						"es-ES": "reason",
						ko: "reason",
						uk: "reason",
						de: "reason",
						it: "reason",
						"pt-BR": "reason",
						pl: "reason"
					},

					type: ApplicationCommandOptionType.String,

					description: "What reason for you accepting ?",
					description_localizations: {
						fr: "Quelle message vous voulez laissez à la suggestion",
						ja: "承認する理由は？",
						ru: "Причина принятия?",
						"es-ES": "Que razón tienes para aceptar?",
						ko: "수락 사유는 무엇인가요?",
						uk: "Яка причина прийняття?",
						de: "Aus welchem Grund nimmst du an?",
						it: "Qual è il motivo dell'approvazione?",
						"pt-BR": "Qual é o motivo da aprovação?",
						pl: "Jaki jest powód akceptacji?"
					},

					required: true,

					permission: null
				}
			],
			ephemeral: true,
			permission: null
		},
		{
			name: "delete",
			name_localizations: {
				fr: "supprimer",
				ja: "delete",
				ru: "delete",
				"es-ES": "delete",
				ko: "delete",
				uk: "delete",
				de: "delete",
				it: "delete",
				"pt-BR": "delete",
				pl: "delete"
			},
			prefixName: "sug-delete",

			description: "Delete an suggestion!",
			description_localizations: {
				fr: "Supprimer une suggestion (Requiert permissions Admin)",
				ja: "提案を削除！",
				ru: "Удалить предложение!",
				"es-ES": "Eliminar una sugerencia!",
				ko: "건의를 삭제해요!",
				uk: "Видалити пропозицію!",
				de: "Lösche einen Vorschlag!",
				it: "Elimina un suggerimento!",
				"pt-BR": "Exclua uma sugestão!",
				pl: "Usuń sugestię!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?",
						ko: "건의 ID는 무엇인가요?",
						uk: "Який ID пропозиції?",
						de: "Wie lautet die ID des Vorschlags?",
						it: "Qual è l'ID del suggerimento?",
						"pt-BR": "Qual é o ID da sugestão?",
						pl: "Jakie jest ID sugestii?"
					},

					required: true,

					permission: null
				}
			],

			ephemeral: true,
			permission: null
		},
		{
			name: "status",
			prefixName: "sug-status",

			description: "Change the status of a suggestion!",
			description_localizations: {
				fr: "Changer le statut d'une suggestion",
				ja: "提案のステータスを変更！",
				ru: "Изменить статус предложения!",
				"es-ES": "Cambiar el estado de una sugerencia!",
				ko: "건의의 상태를 변경해요!",
				uk: "Змінити статус пропозиції!",
				de: "Ändere den Status eines Vorschlags!",
				it: "Cambia lo stato di un suggerimento!",
				"pt-BR": "Altere o status de uma sugestão!",
				pl: "Zmień status sugestii!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'identifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?",
						ko: "건의 ID는 무엇인가요?",
						uk: "Який ID пропозиції?",
						de: "Wie lautet die ID des Vorschlags?",
						it: "Qual è l'ID del suggerimento?",
						"pt-BR": "Qual é o ID da sugestão?",
						pl: "Jakie jest ID sugestii?"
					},

					required: true,

					permission: null
				},
				{
					name: "status",
					type: ApplicationCommandOptionType.String,

					description: "The new status",
					description_localizations: {
						fr: "Le nouveau statut",
						ja: "新しいステータス",
						ru: "Новый статус",
						"es-ES": "El nuevo estado",
						ko: "새 상태",
						uk: "Новий статус",
						de: "Der neue Status",
						it: "Il nuovo stato",
						"pt-BR": "O novo status",
						pl: "Nowy status"
					},

					required: true,
					choices: [
						{
							name: "Pending",
							name_localizations: {
								fr: "En attente",
								ja: "保留中",
								ru: "Ожидает",
								"es-ES": "Pendiente",
								ko: "대기 중",
								uk: "Очікує",
								de: "Ausstehend",
								it: "In attesa",
								"pt-BR": "Pendente",
								pl: "Oczekuje"
							},
							value: "pending"
						},
						{
							name: "Under review",
							name_localizations: {
								fr: "À l'étude",
								ja: "検討中",
								ru: "На рассмотрении",
								"es-ES": "En revisión",
								ko: "검토 중",
								uk: "На розгляді",
								de: "In Prüfung",
								it: "In revisione",
								"pt-BR": "Em análise",
								pl: "W trakcie rozpatrywania"
							},
							value: "reviewing"
						},
						{
							name: "Accepted",
							name_localizations: {
								fr: "Acceptée",
								ja: "承認済み",
								ru: "Принято",
								"es-ES": "Aceptada",
								ko: "수락됨",
								uk: "Прийнято",
								de: "Angenommen",
								it: "Accettato",
								"pt-BR": "Aceito",
								pl: "Zaakceptowano"
							},
							value: "accepted"
						},
						{
							name: "Planned",
							name_localizations: {
								fr: "Planifiée",
								ja: "計画済み",
								ru: "Запланировано",
								"es-ES": "Planificada",
								ko: "예정됨",
								uk: "Заплановано",
								de: "Geplant",
								it: "Pianificato",
								"pt-BR": "Planejado",
								pl: "Planowane"
							},
							value: "planned"
						},
						{
							name: "Implemented",
							name_localizations: {
								fr: "Implémentée",
								ja: "実装済み",
								ru: "Реализовано",
								"es-ES": "Implementada",
								ko: "반영됨",
								uk: "Реалізовано",
								de: "Umgesetzt",
								it: "Implementato",
								"pt-BR": "Implementado",
								pl: "Zaimplementowano"
							},
							value: "implemented"
						},
						{
							name: "Denied",
							name_localizations: {
								fr: "Refusée",
								ja: "却下",
								ru: "Отклонено",
								"es-ES": "Rechazada",
								ko: "거절됨",
								uk: "Відхилено",
								de: "Abgelehnt",
								it: "Rifiutato",
								"pt-BR": "Recusado",
								pl: "Odrzucono"
							},
							value: "denied"
						}
					],

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "An optional message for the author",
					description_localizations: {
						fr: "Un message optionnel pour l'auteur",
						ja: "投稿者への任意のメッセージ",
						ru: "Необязательное сообщение для автора",
						"es-ES": "Un mensaje opcional para el autor",
						ko: "작성자에게 보낼 메시지 (선택)",
						uk: "Необов'язкове повідомлення для автора",
						de: "Eine optionale Nachricht an den Autor",
						it: "Un messaggio facoltativo per l'autore",
						"pt-BR": "Uma mensagem opcional para o autor",
						pl: "Opcjonalna wiadomość dla autora"
					},

					required: false,

					permission: null
				}
			],

			ephemeral: true,
			permission: null
		},
		{
			name: "list",
			prefixName: "sug-list",

			description: "List the most popular suggestions!",
			description_localizations: {
				fr: "Lister les suggestions les plus populaires",
				ja: "人気の提案を一覧表示！",
				ru: "Показать самые популярные предложения!",
				"es-ES": "Listar las sugerencias más populares!",
				ko: "가장 인기 있는 건의 목록을 확인해요!",
				uk: "Показати найпопулярніші пропозиції!",
				de: "Die beliebtesten Vorschläge auflisten!",
				it: "Elenca i suggerimenti più popolari!",
				"pt-BR": "Liste as sugestões mais populares!",
				pl: "Wyświetl najpopularniejsze sugestie!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "status",
					type: ApplicationCommandOptionType.String,

					description: "Only show this status",
					description_localizations: {
						fr: "Afficher uniquement ce statut",
						ja: "このステータスのみ表示",
						ru: "Показывать только этот статус",
						"es-ES": "Mostrar solo este estado",
						ko: "이 상태만 표시",
						uk: "Показувати лише цей статус",
						de: "Nur diesen Status anzeigen",
						it: "Mostra solo questo stato",
						"pt-BR": "Mostrar só este status",
						pl: "Pokaż tylko ten status"
					},

					required: false,
					choices: [
						{
							name: "Pending",
							name_localizations: {
								fr: "En attente",
								ja: "保留中",
								ru: "Ожидает",
								"es-ES": "Pendiente",
								ko: "대기 중",
								uk: "Очікує",
								de: "Ausstehend",
								it: "In attesa",
								"pt-BR": "Pendente",
								pl: "Oczekuje"
							},
							value: "pending"
						},
						{
							name: "Under review",
							name_localizations: {
								fr: "À l'étude",
								ja: "検討中",
								ru: "На рассмотрении",
								"es-ES": "En revisión",
								ko: "검토 중",
								uk: "На розгляді",
								de: "In Prüfung",
								it: "In revisione",
								"pt-BR": "Em análise",
								pl: "W trakcie rozpatrywania"
							},
							value: "reviewing"
						},
						{
							name: "Accepted",
							name_localizations: {
								fr: "Acceptée",
								ja: "承認済み",
								ru: "Принято",
								"es-ES": "Aceptada",
								ko: "수락됨",
								uk: "Прийнято",
								de: "Angenommen",
								it: "Accettato",
								"pt-BR": "Aceito",
								pl: "Zaakceptowano"
							},
							value: "accepted"
						},
						{
							name: "Planned",
							name_localizations: {
								fr: "Planifiée",
								ja: "計画済み",
								ru: "Запланировано",
								"es-ES": "Planificada",
								ko: "예정됨",
								uk: "Заплановано",
								de: "Geplant",
								it: "Pianificato",
								"pt-BR": "Planejado",
								pl: "Planowane"
							},
							value: "planned"
						},
						{
							name: "Implemented",
							name_localizations: {
								fr: "Implémentée",
								ja: "実装済み",
								ru: "Реализовано",
								"es-ES": "Implementada",
								ko: "반영됨",
								uk: "Реалізовано",
								de: "Umgesetzt",
								it: "Implementato",
								"pt-BR": "Implementado",
								pl: "Zaimplementowano"
							},
							value: "implemented"
						},
						{
							name: "Denied",
							name_localizations: {
								fr: "Refusée",
								ja: "却下",
								ru: "Отклонено",
								"es-ES": "Rechazada",
								ko: "거절됨",
								uk: "Відхилено",
								de: "Abgelehnt",
								it: "Rifiutato",
								"pt-BR": "Recusado",
								pl: "Odrzucono"
							},
							value: "denied"
						}
					],

					permission: null
				}
			],

			ephemeral: true,
			permission: null
		}
	],
	category: "suggestion",
	thinking: true,
	type: ApplicationCommandType.ChatInput,

	permission: null
};

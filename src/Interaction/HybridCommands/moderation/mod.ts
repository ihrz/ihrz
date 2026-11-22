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
	name: "mod",

	description: "Subcommand for moderation category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de modération",
		ja: "モデレーションカテゴリのサブコマンド！",
		ru: "Подкоманда для категории модерации!",
		"es-ES": "Subcomando para la categoría de moderación!",
		ko: "관리 하위 명령어!",
		uk: "Підкоманда категорії модерації!",
		de: "Unterbefehle der Moderations-Kategorie!",
		it: "Sottocomandi della categoria moderazione!",
		"pt-BR": "Subcomandos da categoria moderação!",
		pl: "Podkomendy kategorii moderacji!"
	},

	options: [
		{
			name: "ban",

			description: "Ban a user!",
			description_localizations: {
				fr: "Bannir un utilisateur",
				ja: "ユーザーをバン！",
				ru: "Забанить пользователя!",
				"es-ES": "Banear a un usuario!",
				ko: "사용자를 차단해요!",
				uk: "Заблокувати користувача!",
				de: "Banne einen Nutzer!",
				it: "Banna un utente!",
				"pt-BR": "Bana um usuário!",
				pl: "Zbanuj użytkownika!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to ban",
					description_localizations: {
						fr: "le membre que vous souhaitez bannir",
						ja: "バンしたいメンバー",
						ru: "участник для бана",
						"es-ES": "el miembro que quieres banear",
						ko: "차단할 멤버",
						uk: "Учасник, якого ви хочете заблокувати",
						de: "Das Mitglied, das du bannen willst",
						it: "Il membro da bannare",
						"pt-BR": "O membro que você quer banir",
						pl: "Członek do zbanowania"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "the reason of the bannisement",
					description_localizations: {
						fr: "la raison du ban",
						ja: "バンの理由",
						ru: "причина бана",
						"es-ES": "la razón del baneo",
						ko: "차단 사유",
						uk: "Причина бану",
						de: "Der Grund für den Bann",
						it: "Il motivo del ban",
						"pt-BR": "O motivo do banimento",
						pl: "Powód bana"
					},

					required: false,

					permission: null
				}
			],

			aliases: ["addban", "createban"],
			permission: PermissionFlagsBits.BanMembers
		},
		{
			name: "baninfo",

			description: "Check if user is banned and why",
			description_localizations: {
				fr: "Vérifier si l'utilisateur est bannis du serveur et pourquoi",
				ja: "ユーザーがバンされているかとその理由を確認",
				ru: "Проверить, забанен ли пользователь и почему",
				"es-ES": "Comprobar si el usuario está baneado y por qué",
				ko: "사용자가 차단되었는지와 그 사유를 확인해요",
				uk: "Перевірити, чи заблоковано користувача і чому",
				de: "Prüfe, ob ein Nutzer gebannt ist und warum",
				it: "Controlla se un utente è bannato e perché",
				"pt-BR": "Verifique se um usuário está banido e por quê",
				pl: "Sprawdź, czy użytkownik jest zbanowany i dlaczego"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to check",
					description_localizations: {
						fr: "le membre que vous souhaitez vérifier",
						ja: "確認したいメンバー",
						ru: "участник для проверки",
						"es-ES": "el miembro que quieres comprobar",
						ko: "확인할 멤버",
						uk: "Учасник, якого ви хочете перевірити",
						de: "Das Mitglied, das du prüfen willst",
						it: "Il membro da controllare",
						"pt-BR": "O membro que você quer verificar",
						pl: "Członek do sprawdzenia"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.BanMembers
		},
		{
			name: "banlist",

			description: "Show a list with all banned member",
			description_localizations: {
				fr: "Affiche une liste des gens bannis",
				ja: "バンされた全メンバーのリストを表示",
				ru: "Показать список забаненных участников",
				"es-ES": "Mostrar una lista con todos los miembros baneados",
				ko: "차단된 모든 멤버 목록을 보여줘요",
				uk: "Показати список усіх заблокованих учасників",
				de: "Zeigt eine Liste aller gebannten Mitglieder",
				it: "Mostra l'elenco di tutti i membri bannati",
				"pt-BR": "Mostra a lista de todos os membros banidos",
				pl: "Pokazuje listę wszystkich zbanowanych członków"
			},

			aliases: ["bans", "listban", "listbans", "banlists"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "clear",

			description: "Clear a amount of message in the channel !",
			description_localizations: {
				fr: "Effacer une quantité de message dans le cannal",
				ja: "チャンネル内のメッセージを一括削除！",
				ru: "Очистить количество сообщений в канале!",
				"es-ES": "Limpiar una cantidad de mensajes en el canal!",
				ko: "채널의 메시지를 원하는 개수만큼 삭제해요!",
				uk: "Видалити певну кількість повідомлень у каналі!",
				de: "Lösche eine Anzahl Nachrichten im Kanal!",
				it: "Elimina un certo numero di messaggi nel canale!",
				"pt-BR": "Apague uma quantidade de mensagens no canal!",
				pl: "Usuń określoną liczbę wiadomości na kanale!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "number",
					type: ApplicationCommandOptionType.Number,

					description: "The number of message you want to delete !",
					description_localizations: {
						fr: "Le nombre de messages que vous souhaitez supprimer",
						ja: "削除したいメッセージ数！",
						ru: "Количество сообщений для удаления!",
						"es-ES": "El número de mensajes que quieres eliminar!",
						ko: "삭제할 메시지 수!",
						uk: "Кількість повідомлень, яку ви хочете видалити!",
						de: "Anzahl der Nachrichten, die gelöscht werden sollen!",
						it: "Numero di messaggi da eliminare!",
						"pt-BR": "Número de mensagens a excluir!",
						pl: "Liczba wiadomości do usunięcia!"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member you want to delete the message",
					description_localizations: {
						fr: "Le membre dont vous souhaitez supprimer les messages",
						ja: "メッセージを削除したいメンバー",
						ru: "Участник, чьи сообщения удалить",
						"es-ES":
							"El miembro del que quieres eliminar el mensaje",
						ko: "메시지를 삭제할 멤버",
						uk: "Учасник, чиї повідомлення ви хочете видалити",
						de: "Das Mitglied, dessen Nachrichten gelöscht werden",
						it: "Il membro di cui eliminare i messaggi",
						"pt-BR": "O membro cujas mensagens você quer excluir",
						pl: "Członek, którego wiadomości usunąć"
					},

					required: false,

					permission: null
				}
			],

			aliases: ["cls"],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "mutelist",

			aliases: ["allmute", "allmutes", "alltimeout", "alltimeouts"],

			description: "Show a list with all muted member",
			description_localizations: {
				fr: "Affiche une liste des gens mise en sourdine",
				ja: "ミュートされた全メンバーのリストを表示",
				ru: "Показать список замученных участников",
				"es-ES": "Mostrar una lista con todos los miembros silenciados",
				ko: "타임아웃된 모든 멤버 목록을 보여줘요",
				uk: "Показати список усіх заглушених учасників",
				de: "Zeigt eine Liste aller stummgeschalteten Mitglieder",
				it: "Mostra l'elenco di tutti i membri silenziati",
				"pt-BR": "Mostra a lista de todos os membros silenciados",
				pl: "Pokazuje listę wszystkich wyciszonych członków"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "kick",

			description: "Kick a user!",
			description_localizations: {
				fr: "Expulser un utilisateur",
				ja: "ユーザーをキック！",
				ru: "Кикнуть пользователя!",
				"es-ES": "Expulsar a un usuario!",
				ko: "사용자를 추방해요!",
				uk: "Вигнати користувача!",
				de: "Kicke einen Nutzer!",
				it: "Espelli un utente!",
				"pt-BR": "Expulse um usuário!",
				pl: "Wyrzuć użytkownika!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to kick",
					description_localizations: {
						fr: "le membre que vous voulez expulser",
						ja: "キックしたいメンバー",
						ru: "участник для кика",
						"es-ES": "el miembro que quieres expulsar",
						ko: "추방할 멤버",
						uk: "Учасник, якого ви хочете вигнати",
						de: "Das Mitglied, das du kicken willst",
						it: "Il membro da espellere",
						"pt-BR": "O membro que você quer expulsar",
						pl: "Członek do wyrzucenia"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "the reason of the kick",
					description_localizations: {
						fr: "la raison du kick",
						ja: "キックの理由",
						ru: "причина кика",
						"es-ES": "la razón de la expulsión",
						ko: "추방 사유",
						uk: "Причина вигнання",
						de: "Der Grund für den Kick",
						it: "Il motivo dell'espulsione",
						"pt-BR": "O motivo da expulsão",
						pl: "Powód wyrzucenia"
					},

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.KickMembers
		},
		{
			name: "lock",

			description:
				"Remove ability to speak of all users in this text channel!",
			description_localizations: {
				fr: "Supprimer la possibilité de parler de tous les utilisateurs de ce channel",
				ja: "このテキストチャンネルで全ユーザーの発言権限を削除！",
				ru: "Убрать возможность говорить у всех в этом текстовом канале!",
				"es-ES":
					"Quitar la capacidad de hablar a todos los usuarios en este canal de texto!",
				ko: "이 텍스트 채널에서 모든 사용자의 발언을 막아요!",
				uk: "Заборонити всім користувачам писати в цьому текстовому каналі!",
				de: "Entziehe allen Nutzern das Schreiben in diesem Textkanal!",
				it: "Rimuovi a tutti gli utenti la possibilità di scrivere in questo canale!",
				"pt-BR":
					"Remova a capacidade de falar de todos os usuários neste canal de texto!",
				pl: "Odbierz wszystkim użytkownikom możliwość pisania na tym kanale tekstowym!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol",
						ko: "역할",
						uk: "Роль",
						de: "Die Rolle",
						it: "Il ruolo",
						"pt-BR": "O cargo",
						pl: "Rola"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "lock-all",

			description:
				"Remove ability to speak of all users in all channels!",
			description_localizations: {
				fr: "Supprimer la possibilité de parler de tous les utilisateurs sur tous les channel",
				ja: "全チャンネルで全ユーザーの発言権限を削除！",
				ru: "Убрать возможность говорить у всех во всех каналах!",
				"es-ES":
					"Quitar la capacidad de hablar a todos los usuarios en todos los canales!",
				ko: "모든 채널에서 모든 사용자의 발언을 막아요!",
				uk: "Заборонити всім користувачам писати в усіх каналах!",
				de: "Entziehe allen Nutzern das Sprechen in allen Kanälen!",
				it: "Rimuovi a tutti gli utenti la possibilità di scrivere in tutti i canali!",
				"pt-BR":
					"Remova a capacidade de falar de todos os usuários em todos os canais!",
				pl: "Odbierz wszystkim użytkownikom możliwość pisania na wszystkich kanałach!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol",
						ko: "역할",
						uk: "Роль",
						de: "Die Rolle",
						it: "Il ruolo",
						"pt-BR": "O cargo",
						pl: "Rola"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			aliases: ["lockall"],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "unlock-all",

			description: "Give ability to speak of all users in all channels!",
			description_localizations: {
				fr: "Donner la possibilité de parler de tous les utilisateurs sur tous les channels",
				ja: "全チャンネルで全ユーザーに発言権限を付与！",
				ru: "Дать возможность говорить всем во всех каналах!",
				"es-ES":
					"Dar capacidad de hablar a todos los usuarios en todos los canales!",
				ko: "모든 채널에서 모든 사용자가 말할 수 있게 해요!",
				uk: "Дозволити всім користувачам писати в усіх каналах!",
				de: "Erlaube allen Nutzern das Sprechen in allen Kanälen!",
				it: "Dai a tutti gli utenti la possibilità di scrivere in tutti i canali!",
				"pt-BR":
					"Dê a todos os usuários a capacidade de falar em todos os canais!",
				pl: "Pozwól wszystkim użytkownikom pisać na wszystkich kanałach!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol",
						ko: "역할",
						uk: "Роль",
						de: "Die Rolle",
						it: "Il ruolo",
						"pt-BR": "O cargo",
						pl: "Rola"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			aliases: ["unlockall"],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "tempmute",

			description: "Temporarily mute a user!",
			description_localizations: {
				fr: "Couper temporairement la possibilité d'envoyer des message pour un utilisateur",
				ja: "ユーザーを一時的にミュート！",
				ru: "Временно замутить пользователя!",
				"es-ES": "Silenciar temporalmente a un usuario!",
				ko: "사용자를 일시적으로 타임아웃해요!",
				uk: "Тимчасово заглушити користувача!",
				de: "Schaltet ein Mitglied zeitweise stumm!",
				it: "Silenzia temporaneamente un utente!",
				"pt-BR": "Silencia um usuário temporariamente!",
				pl: "Tymczasowo wycisza użytkownika!"
			},

			aliases: ["mute"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to unmuted",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez dé-mute textuellement",
						ja: "ミュート解除したいユーザー",
						ru: "Пользователь для размута",
						"es-ES": "El usuario que quieres desilenciar",
						ko: "타임아웃을 해제할 사용자",
						uk: "Користувач, якого ви хочете заглушити",
						de: "Das Mitglied, dessen Stummschaltung aufgehoben wird",
						it: "L'utente a cui togliere il silenziamento",
						"pt-BR": "O usuário que você quer dessilenciar",
						pl: "Użytkownik do odciszenia"
					},

					required: true,

					permission: null
				},
				{
					name: "time",
					type: ApplicationCommandOptionType.String,

					description: "the duration of the user's tempmute",
					description_localizations: {
						fr: "la durée du tempmute de l'utilisateur",
						ja: "ユーザーの一時的ミュート期間",
						ru: "длительность временного мута",
						"es-ES": "la duración del silencio temporal",
						ko: "사용자의 임시 타임아웃 기간",
						uk: "Тривалість тимчасового заглушення",
						de: "Die Dauer der zeitweisen Stummschaltung",
						it: "La durata del silenziamento temporaneo",
						"pt-BR": "A duração do silenciamento temporário",
						pl: "Czas trwania tymczasowego wyciszenia"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "the reason why you tempmuted",
					description_localizations: {
						fr: "la raison du tempmute",
						ja: "一時的ミュートの理由",
						ru: "причина временного мута",
						"es-ES": "la razón del silencio temporal",
						ko: "임시 타임아웃 사유",
						uk: "Причина тимчасового заглушення",
						de: "Der Grund für die zeitweise Stummschaltung",
						it: "Il motivo del silenziamento temporaneo",
						"pt-BR": "O motivo do silenciamento temporário",
						pl: "Powód tymczasowego wyciszenia"
					},

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unban",

			description: "Unban a user!",
			description_localizations: {
				fr: "Annuler le bannissement d'un utilisateur",
				ja: "ユーザーのバンを解除！",
				ru: "Разбанить пользователя!",
				"es-ES": "Desbanear a un usuario!",
				ko: "사용자 차단을 해제해요!",
				uk: "Розблокувати користувача!",
				de: "Entbannt ein Mitglied!",
				it: "Sbanna un utente!",
				"pt-BR": "Desbane um usuário!",
				pl: "Odbanowuje użytkownika!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "userid",
					type: ApplicationCommandOptionType.String,

					description: "The id of the user you want to unban !",
					description_localizations: {
						fr: "L'identifiant de l'utilisateur que vous souhaitez débannir",
						ja: "バン解除したいユーザーのID！",
						ru: "ID пользователя для разбана!",
						"es-ES": "El ID del usuario que quieres desbanear!",
						ko: "차단 해제할 사용자의 ID!",
						uk: "ID користувача, якого ви хочете розблокувати!",
						de: "ID des Mitglieds, das du entbannen willst!",
						it: "ID dell'utente da sbannare!",
						"pt-BR": "ID do usuário que você quer desbanir!",
						pl: "ID użytkownika do odbanowania!"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					type: ApplicationCommandOptionType.String,

					description: "The reason for unbanning this user.",
					description_localizations: {
						fr: "La raison du bannissement de cet utilisateur",
						ja: "このユーザーのバン解除の理由。",
						ru: "Причина разбана этого пользователя.",
						"es-ES": "La razón para desbanear a este usuario.",
						ko: "이 사용자의 차단 해제 사유",
						uk: "Причина розблокування цього користувача.",
						de: "Der Grund für die Entbannung.",
						it: "Il motivo dello sban.",
						"pt-BR": "O motivo do desbanimento.",
						pl: "Powód odbanowania."
					},

					required: false,

					permission: null
				}
			],

			aliases: ["delban", "removeban", "deban", "pardon"],

			permission: PermissionFlagsBits.BanMembers
		},
		{
			name: "unlock",

			description: "Give ability to speak of all users in this text!",
			description_localizations: {
				fr: "Donner la possibilité de parler de tous les utilisateurs dans ce texte",
				ja: "このテキスト内の全ユーザーに発言権限を付与！",
				ru: "Дать возможность говорить всем в этом текстовом канале!",
				"es-ES":
					"Dar capacidad de hablar a todos los usuarios en este texto!",
				ko: "이 채널에서 모든 사용자가 말할 수 있게 해요!",
				uk: "Дозволити всім користувачам писати в цьому текстовому каналі!",
				de: "Erlaube allen Nutzern das Schreiben in diesem Textkanal!",
				it: "Dai a tutti gli utenti la possibilità di scrivere in questo canale!",
				"pt-BR":
					"Dê a todos os usuários a capacidade de falar neste canal de texto!",
				pl: "Pozwól wszystkim użytkownikom pisać na tym kanale tekstowym!"
			},

			options: [
				{
					name: "role",

					description: "The role",
					description_localizations: {
						fr: "le rôle",
						ja: "ロール",
						ru: "Роль",
						"es-ES": "El rol",
						ko: "역할",
						uk: "Роль",
						de: "Die Rolle",
						it: "Il ruolo",
						"pt-BR": "O cargo",
						pl: "Rola"
					},

					required: false,
					type: ApplicationCommandOptionType.Role,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "unmute",

			description: "Unmute a user!",
			description_localizations: {
				fr: "Demute un utilisateur !",
				ja: "ユーザーのミュートを解除！",
				ru: "Размутить пользователя!",
				"es-ES": "Desilenciar a un usuario!",
				ko: "사용자의 타임아웃을 해제해요!",
				uk: "Зняти заглушення з користувача!",
				de: "Hebt die Stummschaltung eines Mitglieds auf!",
				it: "Rimuove il silenziamento di un utente!",
				"pt-BR": "Dessilencia um usuário!",
				pl: "Odcisza użytkownika!"
			},

			aliases: ["untempmute", "untimeout", "demute"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to unmuted",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez unmuted",
						ja: "ミュート解除したいユーザー",
						ru: "Пользователь для размута",
						"es-ES": "El usuario que quieres desilenciar",
						ko: "타임아웃을 해제할 사용자",
						uk: "Користувач, якого ви хочете заглушити",
						de: "Das Mitglied, dessen Stummschaltung aufgehoben wird",
						it: "L'utente a cui togliere il silenziamento",
						"pt-BR": "O usuário que você quer dessilenciar",
						pl: "Użytkownik do odciszenia"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unmuteall",

			description: "Unmute all muted members!",
			description_localizations: {
				fr: "Demute tous les membres mute textuellement",
				ja: "全ミュートメンバーのミュートを解除！",
				ru: "Размутить всех замученных участников!",
				"es-ES": "Desilenciar a todos los miembros silenciados!",
				ko: "타임아웃된 모든 멤버를 해제해요!",
				uk: "Зняти заглушення з усіх заглушених учасників!",
				de: "Hebt die Stummschaltung aller Mitglieder auf!",
				it: "Rimuove il silenziamento di tutti i membri silenziati!",
				"pt-BR": "Dessilencia todos os membros silenciados!",
				pl: "Odcisza wszystkich wyciszonych członków!"
			},

			aliases: [
				"unmute-all",
				"untimeoutall",
				"untimeout-all",
				"demuteall"
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "warn",

			description: "warn a user",
			description_localizations: {
				fr: "avertir un utilisateur",
				ja: "ユーザーを警告",
				ru: "предупредить пользователя",
				"es-ES": "advertir a un usuario",
				ko: "사용자에게 경고해요",
				uk: "Видати попередження користувачу",
				de: "Verwarnt ein Mitglied",
				it: "Avvisa un utente",
				"pt-BR": "Adverte um usuário",
				pl: "Ostrzega użytkownika"
			},

			options: [
				{
					name: "member",

					description: "The member you want to warn",
					description_localizations: {
						fr: "le membre que vous voulez signaler",
						ja: "警告したいメンバー",
						ru: "Участник для предупреждения",
						"es-ES": "El miembro al que quieres advertir",
						ko: "경고할 멤버",
						uk: "Учасник, якому ви хочете видати попередження",
						de: "Das Mitglied, das du verwarnen willst",
						it: "Il membro da avvisare",
						"pt-BR": "O membro que você quer advertir",
						pl: "Członek do ostrzeżenia"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				},
				{
					name: "reason",

					description: "The reason why you want to warn this member",
					description_localizations: {
						fr: "La raison du warn",
						ja: "このメンバーを警告する理由",
						ru: "Причина предупреждения этого участника",
						"es-ES":
							"La razón por la que quieres advertir a este miembro",
						ko: "이 멤버에게 경고하는 사유",
						uk: "Причина попередження цього учасника",
						de: "Der Grund, warum du dieses Mitglied verwarnst",
						it: "Il motivo per cui vuoi avvisare questo membro",
						"pt-BR":
							"O motivo pelo qual você quer advertir este membro",
						pl: "Powód ostrzeżenia tego członka"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "note",

					description:
						"A private note for the staff (never sent to the member)",
					description_localizations: {
						fr: "Une note privée pour le staff (jamais envoyée au membre)",
						ja: "スタッフ用の非公開メモ（メンバーには送られません）",
						ru: "Личная заметка для стаффа (участнику не отправляется)",
						"es-ES":
							"Una nota privada para el staff (nunca se envía al miembro)",
						ko: "스태프 전용 비공개 메모 (멤버에게 보내지 않아요)",
						uk: "Приватна нотатка для персоналу (ніколи не надсилається учаснику)",
						de: "Eine private Notiz fürs Team (wird nie ans Mitglied gesendet)",
						it: "Una nota privata per lo staff (mai inviata al membro)",
						"pt-BR":
							"Uma nota privada para a equipe (nunca enviada ao membro)",
						pl: "Prywatna notatka dla ekipy (nigdy niewysyłana członkowi)"
					},

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unwarn",

			description: "unwarn a user",
			description_localizations: {
				fr: "supprimer un avertissement d'un utilisateur",
				ja: "ユーザーの警告を解除",
				ru: "снять предупреждение",
				"es-ES": "quitar advertencia",
				ko: "사용자의 경고를 취소해요",
				uk: "Зняти попередження з користувача",
				de: "Hebt die Verwarnung eines Mitglieds auf",
				it: "Rimuove l'avviso a un utente",
				"pt-BR": "Remove o aviso de um usuário",
				pl: "Zdejmuje ostrzeżenie użytkownikowi"
			},

			options: [
				{
					name: "member",

					description: "The member you want to unwarn",
					description_localizations: {
						fr: "le membre que vous voulez enlever sont signalement",
						ja: "警告を解除したいメンバー",
						ru: "Участник для снятия предупреждения",
						"es-ES":
							"El miembro al que quieres quitar la advertencia",
						ko: "경고를 취소할 멤버",
						uk: "Учасник, з якого ви хочете зняти попередження",
						de: "Das Mitglied, dessen Verwarnung du aufheben willst",
						it: "Il membro a cui togliere l'avviso",
						"pt-BR": "O membro cujo aviso você quer remover",
						pl: "Członek, któremu zdjąć ostrzeżenie"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				},
				{
					name: "warn-id",

					description: "The warn id",
					description_localizations: {
						fr: "l'identifiant du warn",
						ja: "警告ID",
						ru: "ID предупреждения",
						"es-ES": "El ID de la advertencia",
						ko: "경고 ID",
						uk: "ID попередження",
						de: "Die Verwarnungs-ID",
						it: "L'ID dell'avviso",
						"pt-BR": "O ID do aviso",
						pl: "ID ostrzeżenia"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "warnlist",

			description: "show all warns of a user",
			description_localizations: {
				fr: "afficher tout les avertissement d'un utilisateur",
				ja: "ユーザーの全警告を表示",
				ru: "показать все предупреждения пользователя",
				"es-ES": "mostrar todas las advertencias de un usuario",
				ko: "사용자의 모든 경고를 보여줘요",
				uk: "Показати всі попередження користувача",
				de: "Zeigt alle Verwarnungen eines Mitglieds",
				it: "Mostra tutti gli avvisi di un utente",
				"pt-BR": "Mostra todos os avisos de um usuário",
				pl: "Pokazuje wszystkie ostrzeżenia użytkownika"
			},

			options: [
				{
					name: "member",

					description: "The member you want to lookup",
					description_localizations: {
						fr: "le membre que vous shouaiter vérifier",
						ja: "検索したいメンバー",
						ru: "Участник для поиска",
						"es-ES": "El miembro que quieres buscar",
						ko: "조회할 멤버",
						uk: "Учасник, якого ви хочете переглянути",
						de: "Das Mitglied, das du nachschlagen willst",
						it: "Il membro da cercare",
						"pt-BR": "O membro que você quer consultar",
						pl: "Członek do sprawdzenia"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				}
			],

			aliases: [
				"warns",
				"listwarns",
				"listwarn",
				"warnslist",
				"sanctions"
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "warnconfig",

			description: "Warning settings: expiry and automatic sanctions",
			description_localizations: {
				fr: "Réglages des avertissements : expiration et sanctions automatiques",
				ja: "警告の設定：有効期限と自動処罰",
				ru: "Настройки предупреждений: срок действия и автоматические наказания",
				"es-ES":
					"Ajustes de advertencias: caducidad y sanciones automáticas",
				ko: "경고 설정: 만료와 자동 처벌",
				uk: "Налаштування попереджень: термін дії та автоматичні санкції",
				de: "Verwarnungs-Einstellungen: Ablauf und automatische Strafen",
				it: "Impostazioni avvisi: scadenza e sanzioni automatiche",
				"pt-BR":
					"Configurações de avisos: validade e sanções automáticas",
				pl: "Ustawienia ostrzeżeń: wygasanie i automatyczne kary"
			},

			options: [
				{
					name: "threshold",

					description:
						"Number of active warnings that triggers the sanction",
					description_localizations: {
						fr: "Nombre d'avertissements actifs qui déclenche la sanction",
						ja: "処罰が発動する有効な警告の数",
						ru: "Число активных предупреждений для наказания",
						"es-ES":
							"Número de advertencias activas que activa la sanción",
						ko: "처벌이 발동되는 유효한 경고 수",
						uk: "Кількість активних попереджень, що запускає санкцію",
						de: "Anzahl aktiver Verwarnungen, die die Sanktion auslöst",
						it: "Numero di avvisi attivi che fa scattare la sanzione",
						"pt-BR": "Número de avisos ativos que aciona a sanção",
						pl: "Liczba aktywnych ostrzeżeń uruchamiająca karę"
					},

					type: ApplicationCommandOptionType.Integer,
					required: false,

					permission: null
				},
				{
					name: "sanction",

					description:
						"The sanction at this threshold (none removes it)",
					description_localizations: {
						fr: "La sanction à ce seuil (none la retire)",
						ja: "このしきい値での処罰（none で削除）",
						ru: "Наказание на этом пороге (none — удалить)",
						"es-ES": "La sanción en este umbral (none la quita)",
						ko: "이 기준의 처벌 (none은 삭제)",
						uk: "Санкція на цьому порозі (none — прибрати її)",
						de: "Strafe bei diesem Schwellenwert (none entfernt sie)",
						it: "Sanzione a questa soglia (none la rimuove)",
						"pt-BR": "Sanção neste limite (none a remove)",
						pl: "Kara przy tym progu (none ją usuwa)"
					},

					type: ApplicationCommandOptionType.String,
					required: false,
					choices: [
						{
							name: "Timeout",
							name_localizations: {
								fr: "Exclusion temporaire",
								ja: "タイムアウト",
								ru: "Тайм-аут",
								"es-ES": "Aislamiento",
								ko: "타임아웃",
								uk: "Тайм-аут",
								de: "Timeout",
								it: "Timeout",
								"pt-BR": "Timeout",
								pl: "Timeout"
							},
							value: "timeout"
						},
						{
							name: "Kick",
							name_localizations: {
								fr: "Expulsion",
								ja: "キック",
								ru: "Кик",
								"es-ES": "Expulsión",
								ko: "추방",
								uk: "Вигнання",
								de: "Kicken",
								it: "Espelli",
								"pt-BR": "Expulsar",
								pl: "Wyrzuć"
							},
							value: "kick"
						},
						{
							name: "Ban",
							name_localizations: {
								fr: "Bannissement",
								ja: "BAN",
								ru: "Бан",
								"es-ES": "Baneo",
								ko: "차단",
								uk: "Бан",
								de: "Bannen",
								it: "Banna",
								"pt-BR": "Banir",
								pl: "Zbanuj"
							},
							value: "ban"
						},
						{
							name: "None (remove)",
							name_localizations: {
								fr: "Aucune (retirer)",
								ja: "なし（削除）",
								ru: "Нет (удалить)",
								"es-ES": "Ninguna (quitar)",
								ko: "없음 (삭제)",
								uk: "Немає (прибрати)",
								de: "Keine (entfernen)",
								it: "Nessuno (rimuovi)",
								"pt-BR": "Nenhum (remover)",
								pl: "Brak (usuń)"
							},
							value: "none"
						}
					],

					permission: null
				},
				{
					name: "duration",

					description: "Timeout length, e.g. 1h, 2d (timeout only)",
					description_localizations: {
						fr: "Durée de l'exclusion, ex. 1h, 2d (timeout seulement)",
						ja: "タイムアウトの期間、例：1h、2d（タイムアウトのみ）",
						ru: "Длительность тайм-аута, например 1h, 2d",
						"es-ES":
							"Duración del aislamiento, p. ej. 1h, 2d (solo timeout)",
						ko: "타임아웃 기간, 예: 1h, 2d (타임아웃만)",
						uk: "Тривалість тайм-ауту, наприклад 1h, 2d (лише для тайм-ауту)",
						de: "Timeout-Dauer, z. B. 1h, 2d (nur Timeout)",
						it: "Durata del timeout, es. 1h, 2d (solo timeout)",
						"pt-BR":
							"Duração do timeout, ex.: 1h, 2d (apenas timeout)",
						pl: "Czas timeoutu, np. 1h, 2d (tylko timeout)"
					},

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				},
				{
					name: "expire-days",

					description:
						"Warnings stop counting after this many days (0 = never)",
					description_localizations: {
						fr: "Les avertissements expirent après ce nombre de jours (0 = jamais)",
						ja: "警告がこの日数で失効します（0 = なし）",
						ru: "Предупреждения истекают через столько дней (0 = никогда)",
						"es-ES":
							"Las advertencias caducan tras estos días (0 = nunca)",
						ko: "경고가 이 일수 후 만료돼요 (0 = 없음)",
						uk: "Через скільки днів попередження перестають враховуватися (0 = ніколи)",
						de: "Verwarnungen zählen nach so vielen Tagen nicht mehr (0 = nie)",
						it: "Gli avvisi non contano più dopo questi giorni (0 = mai)",
						"pt-BR":
							"Avisos deixam de contar após estes dias (0 = nunca)",
						pl: "Ostrzeżenia przestają się liczyć po tylu dniach (0 = nigdy)"
					},

					type: ApplicationCommandOptionType.Integer,
					required: false,

					permission: null
				}
			],

			aliases: ["warnsettings", "warn-config"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "clearwarn",

			description: "clear all warns of a user",
			description_localizations: {
				fr: "effacer tout les avertissement d'un utilisateur",
				ja: "ユーザーの全警告をクリア",
				ru: "очистить все предупреждения пользователя",
				"es-ES": "limpiar todas las advertencias de un usuario",
				ko: "사용자의 모든 경고를 지워요",
				uk: "Очистити всі попередження користувача",
				de: "Löscht alle Verwarnungen eines Mitglieds",
				it: "Cancella tutti gli avvisi di un utente",
				"pt-BR": "Limpa todos os avisos de um usuário",
				pl: "Usuwa wszystkie ostrzeżenia użytkownika"
			},

			options: [
				{
					name: "member",

					description: "The member you want to clear",
					description_localizations: {
						fr: "le membre que vous voulez effacer les avertissements",
						ja: "クリアしたいメンバー",
						ru: "Участник для очистки",
						"es-ES": "El miembro que quieres limpiar",
						ko: "정리할 멤버",
						uk: "Учасник, чиї попередження ви хочете очистити",
						de: "Das Mitglied, das du zurücksetzen willst",
						it: "Il membro da ripulire",
						"pt-BR": "O membro que você quer limpar",
						pl: "Członek do wyczyszczenia"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				}
			],

			aliases: [
				"clearwarns",
				"clearwarn",
				"clearsanctions",
				"clearsanction"
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "clear-all-warns",

			description: "clear all warns of all users across the server",
			description_localizations: {
				fr: "effacer tout les avertissement de tous les utilisateurs du serveur",
				ja: "サーバー全体の全ユーザーの警告をクリア",
				ru: "очистить все предупреждения всех пользователей",
				"es-ES":
					"limpiar todas las advertencias de todos los usuarios del servidor",
				ko: "서버 전체 사용자의 모든 경고를 지워요",
				uk: "Очистити всі попередження всіх користувачів сервера",
				de: "Löscht alle Verwarnungen aller Mitglieder des Servers",
				it: "Cancella tutti gli avvisi di tutti gli utenti del server",
				"pt-BR":
					"Limpa todos os avisos de todos os usuários do servidor",
				pl: "Usuwa wszystkie ostrzeżenia wszystkich użytkowników serwera"
			},

			type: ApplicationCommandOptionType.Subcommand,

			aliases: [
				"clearallwarns",
				"clearallwarn",
				"clearsanctionsall",
				"clearsanctionall"
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "temprole",

			description: "Give a role temporary to a server member",
			description_localizations: {
				fr: "Donner un rôle temporairement à un membre de votre serveur discord",
				ja: "サーバーメンバーに一時的にロールを付与",
				ru: "Временно выдать роль участнику сервера",
				"es-ES": "Dar un rol temporal a un miembro del servidor",
				ko: "서버 멤버에게 역할을 임시로 부여해요",
				uk: "Тимчасово видати роль учаснику сервера",
				de: "Gib einem Mitglied zeitweise eine Rolle",
				it: "Assegna temporaneamente un ruolo a un membro del server",
				"pt-BR": "Dê um cargo temporário a um membro do servidor",
				pl: "Nadaj członkowi serwera rolę tymczasowo"
			},

			options: [
				{
					name: "member",

					description: "The member you want to add the role",
					description_localizations: {
						fr: "Le membre qui recevras le rôle",
						ja: "ロールを追加したいメンバー",
						ru: "Участник, которому добавить роль",
						"es-ES": "El miembro al que quieres añadir el rol",
						ko: "역할을 추가할 멤버",
						uk: "Учасник, якому ви хочете видати роль",
						de: "Das Mitglied, dem du die Rolle geben willst",
						it: "Il membro a cui aggiungere il ruolo",
						"pt-BR": "O membro a quem você quer dar o cargo",
						pl: "Członek, któremu dodać rolę"
					},

					permission: null,
					type: ApplicationCommandOptionType.User,
					required: true
				},
				{
					name: "role",

					description: "The role you want to add to the member",
					description_localizations: {
						fr: "Le rôle que recevras le membre",
						ja: "メンバーに追加したいロール",
						ru: "Роль для добавления участнику",
						"es-ES": "El rol que quieres añadir al miembro",
						ko: "멤버에게 추가할 역할",
						uk: "Роль, яку ви хочете видати учаснику",
						de: "Die Rolle, die dem Mitglied hinzugefügt wird",
						it: "Il ruolo da aggiungere al membro",
						"pt-BR": "O cargo que você quer dar ao membro",
						pl: "Rola do dodania członkowi"
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: true
				},
				{
					name: "time",

					description: "The time the member will keep the role",
					description_localizations: {
						fr: "Le temps que le membre auras ce rôle",
						ja: "メンバーがロールを保持する時間",
						ru: "Время, на которое участник получит роль",
						"es-ES": "El tiempo que el miembro mantendrá el rol",
						ko: "멤버가 역할을 유지할 기간",
						uk: "Час, протягом якого учасник матиме роль",
						de: "Wie lange das Mitglied die Rolle behält",
						it: "Per quanto tempo il membro terrà il ruolo",
						"pt-BR": "Por quanto tempo o membro manterá o cargo",
						pl: "Jak długo członek zachowa rolę"
					},

					permission: null,
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: "reason",

					description: "The reason why you added this role",
					description_localizations: {
						fr: "La raison de l'ajout du rôle",
						ja: "このロールを追加した理由",
						ru: "Причина добавления этой роли",
						"es-ES": "La razón por la que añadiste este rol",
						ko: "이 역할을 추가한 사유",
						uk: "Причина видачі цієї ролі",
						de: "Der Grund, warum du diese Rolle hinzugefügt hast",
						it: "Il motivo per cui hai aggiunto questo ruolo",
						"pt-BR": "O motivo pelo qual você adicionou este cargo",
						pl: "Powód dodania tej roli"
					},

					permission: null,
					type: ApplicationCommandOptionType.String,
					required: false
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			aliases: ["addtemprole", "temporaryrole", "temproles"],
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "rolepanel",
			description: "Give selected roles to a member through a panel",
			description_localizations: {
				fr: "Donner des rôles sélectionnés à un membre via un panel",
				ja: "パネルを通じて選択したロールをメンバーに付与",
				ru: "Выдать выбранные роли участнику через панель",
				"es-ES":
					"Dar roles seleccionados a un miembro a través de un panel",
				ko: "패널을 통해 멤버에게 선택한 역할을 부여해요",
				uk: "Видати вибрані ролі учаснику через панель",
				de: "Gib einem Mitglied ausgewählte Rollen über ein Panel",
				it: "Assegna i ruoli scelti a un membro tramite un pannello",
				"pt-BR": "Dê os cargos selecionados a um membro por um painel",
				pl: "Nadaj członkowi wybrane role za pomocą panelu"
			},
			options: [
				{
					name: "member",
					description: "The member who will receive the roles",
					description_localizations: {
						fr: "Le membre qui recevra les rôles",
						ja: "ロールを受け取るメンバー",
						ru: "Участник, который получит роли",
						"es-ES": "El miembro que recibirá los roles",
						ko: "역할을 받을 멤버",
						uk: "Учасник, який отримає ролі",
						de: "Das Mitglied, das die Rollen erhält",
						it: "Il membro che riceverà i ruoli",
						"pt-BR": "O membro que receberá os cargos",
						pl: "Członek, który otrzyma role"
					},
					permission: null,
					type: ApplicationCommandOptionType.User,
					required: false
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageRoles
		},
		{
			name: "tempban",
			description: "Temporarily ban a user from the server",
			description_localizations: {
				fr: "Bannir temporairement un utilisateur du serveur",
				ja: "ユーザーをサーバーから一時的にバン",
				ru: "Временно забанить пользователя на сервере",
				"es-ES": "Banear temporalmente a un usuario del servidor",
				ko: "사용자를 서버에서 일시적으로 차단해요",
				uk: "Тимчасово заблокувати користувача на сервері",
				de: "Bannt ein Mitglied zeitweise vom Server",
				it: "Banna temporaneamente un utente dal server",
				"pt-BR": "Bane um usuário temporariamente do servidor",
				pl: "Tymczasowo banuje użytkownika na serwerze"
			},
			options: [
				{
					name: "user",
					description: "The user you want to temporarily ban",
					description_localizations: {
						fr: "L'utilisateur que vous voulez bannir temporairement",
						ja: "一時的にバンしたいユーザー",
						ru: "Пользователь для временного бана",
						"es-ES": "El usuario que quieres banear temporalmente",
						ko: "일시적으로 차단할 사용자",
						uk: "Користувач, якого ви хочете тимчасово заблокувати",
						de: "Das Mitglied, das du zeitweise bannen willst",
						it: "L'utente da bannare temporaneamente",
						"pt-BR":
							"O usuário que você quer banir temporariamente",
						pl: "Użytkownik do tymczasowego zbanowania"
					},
					permission: null,
					type: ApplicationCommandOptionType.User,
					required: true
				},
				{
					name: "duration",
					description: "The duration of the ban (e.g., 1h, 3d, 1w)",
					description_localizations: {
						fr: "La durée du bannissement (ex: 1h, 3j, 1s)",
						ja: "バン期間（例: 1h, 3d, 1w）",
						ru: "Длительность бана (напр., 1ч, 3д, 1н)",
						"es-ES": "La duración del baneo (ej., 1h, 3d, 1s)",
						ko: "차단 기간 (예: 1h, 3d, 1w)",
						uk: "Тривалість бану (наприклад, 1h, 3d, 1w)",
						de: "Dauer des Banns (z. B. 1h, 3d, 1w)",
						it: "Durata del ban (es. 1h, 3d, 1w)",
						"pt-BR": "Duração do banimento (ex.: 1h, 3d, 1w)",
						pl: "Czas trwania bana (np. 1h, 3d, 1w)"
					},
					permission: null,
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: "reason",
					description: "The reason for the ban",
					description_localizations: {
						fr: "La raison du bannissement",
						ja: "バンの理由",
						ru: "Причина бана",
						"es-ES": "La razón del baneo",
						ko: "차단 사유",
						uk: "Причина бану",
						de: "Der Grund für den Bann",
						it: "Il motivo del ban",
						"pt-BR": "O motivo do banimento",
						pl: "Powód bana"
					},
					permission: null,
					type: ApplicationCommandOptionType.String,
					required: false
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			aliases: ["tban", "temporaryban"],
			permission: PermissionFlagsBits.BanMembers
		}
	],
	thinking: true,
	category: "moderation",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

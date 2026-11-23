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
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "authrestore",

	description:
		"Do the same thing as authrestore with link verification button under iHorizon message",
	description_localizations: {
		fr: "Faites la même chose que authrestore avec le bouton de vérification du lien sous le message iHorizon",
		ja: "iHorizonメッセージの下のリンク確認ボタンでauthrestoreと同じことを行う",
		ru: "Сделать то же, что и authrestore, с кнопкой проверки ссылки под сообщением iHorizon",
		"es-ES":
			"Hacer lo mismo que authrestore con el botón de verificación de enlace bajo el mensaje de iHorizon",
		ko: "iHorizon 메시지 아래의 링크 인증 버튼으로 authrestore와 같은 기능을 해요",
		uk: "Те саме, що й authrestore, з кнопкою перевірки під повідомленням iHorizon",
		de: "Wie authrestore, mit Verifizierungs-Button unter der iHorizon-Nachricht",
		it: "Fa come authrestore, con pulsante di verifica sotto il messaggio di iHorizon",
		"pt-BR":
			"Faz como o authrestore, com botão de verificação na mensagem do iHorizon",
		pl: "Działa jak authrestore, z przyciskiem weryfikacji pod wiadomością iHorizon"
	},

	aliases: [],
	options: [
		{
			name: "set",

			description: "Set the current message for AuthRestore button",
			description_localizations: {
				fr: "Définir le message actuel pour le bouton de AuthRestore",
				ja: "AuthRestoreボタン用の現在のメッセージを設定",
				ru: "Установить текущее сообщение для кнопки AuthRestore",
				"es-ES":
					"Establecer el mensaje actual para el botón AuthRestore",
				ko: "AuthRestore 버튼 메시지를 설정해요",
				uk: "Встановити поточне повідомлення для кнопки AuthRestore",
				de: "Legt die Nachricht für den AuthRestore-Button fest",
				it: "Imposta il messaggio per il pulsante AuthRestore",
				"pt-BR": "Define a mensagem do botão AuthRestore",
				pl: "Ustawia wiadomość przycisku AuthRestore"
			},

			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,

					description: "The channel where is the message",
					description_localizations: {
						fr: "Le salon textuelle où se trouve le message",
						ja: "メッセージがあるチャンネル",
						ru: "Канал, где находится сообщение",
						"es-ES": "El canal donde está el mensaje",
						ko: "메시지가 있는 채널",
						uk: "Канал, у якому знаходиться повідомлення",
						de: "Der Kanal, in dem die Nachricht ist",
						it: "Il canale in cui si trova il messaggio",
						"pt-BR": "O canal onde está a mensagem",
						pl: "Kanał, w którym jest wiadomość"
					},

					channel_types: [ChannelType.GuildText],

					required: true,

					permission: null
				},
				{
					name: "message_id",
					type: ApplicationCommandOptionType.String,

					description:
						"Please copy the identifiant of the message you want to configure",
					description_localizations: {
						fr: "Veuillez copier l'identifiant du message que vous souhaitez configurer",
						ja: "設定したいメッセージの識別子をコピーしてください",
						ru: "Пожалуйста, скопируйте идентификатор сообщения, которое вы хотите настроить",
						"es-ES":
							"Por favor, copia el identificador del mensaje que quieres configurar",
						ko: "설정할 메시지의 ID를 복사해 붙여 넣어 주세요",
						uk: "Будь ласка, скопіюйте ідентифікатор повідомлення, яке хочете налаштувати",
						de: "Kopiere die ID der Nachricht, die du konfigurieren möchtest",
						it: "Copia l'ID del messaggio che vuoi configurare",
						"pt-BR":
							"Copie o ID da mensagem que você quer configurar",
						pl: "Skopiuj ID wiadomości, którą chcesz skonfigurować"
					},

					required: true,

					permission: null
				},
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "The role you want to configure",
					description_localizations: {
						fr: "Le rôle que vous souhaitez configurer",
						ja: "設定したいロール",
						ru: "Роль, которую вы хотите настроить",
						"es-ES": "El rol que quieres configurar",
						ko: "설정할 역할",
						uk: "Роль, яку ви хочете налаштувати",
						de: "Die Rolle, die du konfigurieren willst",
						it: "Il ruolo da configurare",
						"pt-BR": "O cargo que você quer configurar",
						pl: "Rola do skonfigurowania"
					},

					required: true,

					permission: null
				}
			],

			thinking: true,
			ephemeral: true,

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "delete",

			description: "Delete the AuthRestore module button",
			description_localizations: {
				fr: "Supprimer le bouton du module de AuthRestore",
				ja: "AuthRestoreモジュールのボタンを削除",
				ru: "Удалить кнопку модуля AuthRestore",
				"es-ES": "Eliminar el botón del módulo AuthRestore",
				ko: "AuthRestore 모듈 버튼을 삭제해요",
				uk: "Видалити кнопку модуля AuthRestore",
				de: "AuthRestore-Modul-Button löschen",
				it: "Elimina il pulsante del modulo AuthRestore",
				"pt-BR": "Excluir o botão do módulo AuthRestore",
				pl: "Usuń przycisk modułu AuthRestore"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "get",

			description:
				"Get all informations about the AuthRestore module of the guild",
			description_localizations: {
				fr: "Obtenez toutes les informations sur le module AuthRestore de votre guilde",
				ja: "サーバーのAuthRestoreモジュールの全情報を取得",
				ru: "Получить всю информацию о модуле AuthRestore сервера",
				"es-ES":
					"Obtener toda la información sobre el módulo AuthRestore del servidor",
				ko: "서버의 AuthRestore 모듈 정보를 모두 확인해요",
				uk: "Отримати всю інформацію про модуль AuthRestore сервера",
				de: "Alle Infos zum AuthRestore-Modul des Servers",
				it: "Tutte le informazioni sul modulo AuthRestore del server",
				"pt-BR":
					"Todas as informações do módulo AuthRestore do servidor",
				pl: "Wszystkie informacje o module AuthRestore serwera"
			},

			options: [
				{
					name: "key",
					type: ApplicationCommandOptionType.String,

					description: "The private key of your AuthRestore config",
					description_localizations: {
						fr: "La clé privée de votre configuration AuthRestore",
						ja: "AuthRestore設定のプライベートキー",
						ru: "Приватный ключ вашей конфигурации AuthRestore",
						"es-ES":
							"La clave privada de tu configuración AuthRestore",
						ko: "AuthRestore 설정의 비공개 키",
						uk: "Приватний ключ вашої конфігурації AuthRestore",
						de: "Der private Schlüssel deiner AuthRestore-Konfiguration",
						it: "La chiave privata della tua configurazione AuthRestore",
						"pt-BR":
							"A chave privada da sua configuração AuthRestore",
						pl: "Klucz prywatny twojej konfiguracji AuthRestore"
					},

					required: true,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "force-join",

			description:
				"Force all members of your AuthRestore module to join the guild",
			description_localizations: {
				fr: "Forcer tous les membres de votre module AuthRestore à rejoindre la guilde",
				ja: "AuthRestoreモジュールの全メンバーをサーバーに強制参加",
				ru: "Принудительно заставить всех участников AuthRestore присоединиться",
				"es-ES":
					"Forzar a todos los miembros de tu módulo AuthRestore a unirse al servidor",
				ko: "AuthRestore 모듈의 모든 멤버를 서버에 강제로 참여시켜요",
				uk: "Змусити всіх учасників вашого модуля AuthRestore приєднатися до сервера",
				de: "Zwinge alle Mitglieder deines AuthRestore-Moduls, dem Server beizutreten",
				it: "Forza tutti i membri del tuo modulo AuthRestore a entrare nel server",
				"pt-BR":
					"Force todos os membros do seu módulo AuthRestore a entrarem no servidor",
				pl: "Wymuś dołączenie do serwera wszystkich członków modułu AuthRestore"
			},

			options: [
				{
					name: "key",
					type: ApplicationCommandOptionType.String,

					description: "The private key of your AuthRestore config",
					description_localizations: {
						fr: "La clé privée de votre configuration AuthRestore",
						ja: "AuthRestore設定のプライベートキー",
						ru: "Приватный ключ вашей конфигурации AuthRestore",
						"es-ES":
							"La clave privada de tu configuración AuthRestore",
						ko: "AuthRestore 설정의 비공개 키",
						uk: "Приватний ключ вашої конфігурації AuthRestore",
						de: "Der private Schlüssel deiner AuthRestore-Konfiguration",
						it: "La chiave privata della tua configurazione AuthRestore",
						"pt-BR":
							"A chave privada da sua configuração AuthRestore",
						pl: "Klucz prywatny twojej konfiguracji AuthRestore"
					},

					required: true,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "roles",

			description: "Set new roles for the AuthRestore module",
			description_localizations: {
				fr: "Définir un nouveau rôle pour le module AuthRestore",
				ja: "AuthRestoreモジュールの新しいロールを設定",
				ru: "Установить новые роли для модуля AuthRestore",
				"es-ES": "Establecer nuevos roles para el módulo AuthRestore",
				ko: "AuthRestore 모듈의 새 역할을 설정해요",
				uk: "Встановити нові ролі для модуля AuthRestore",
				de: "Legt neue Rollen für das AuthRestore-Modul fest",
				it: "Imposta nuovi ruoli per il modulo AuthRestore",
				"pt-BR": "Define novos cargos para o módulo AuthRestore",
				pl: "Ustawia nowe role dla modułu AuthRestore"
			},

			options: [
				{
					name: "key",
					type: ApplicationCommandOptionType.String,

					description: "The private key of your AuthRestore config",
					description_localizations: {
						fr: "La clé privée de votre configuration AuthRestore",
						ja: "AuthRestore設定のプライベートキー",
						ru: "Приватный ключ вашей конфигурации AuthRestore",
						"es-ES":
							"La clave privada de tu configuración AuthRestore",
						ko: "AuthRestore 설정의 비공개 키",
						uk: "Приватний ключ вашої конфігурації AuthRestore",
						de: "Der private Schlüssel deiner AuthRestore-Konfiguration",
						it: "La chiave privata della tua configurazione AuthRestore",
						"pt-BR":
							"A chave privada da sua configuração AuthRestore",
						pl: "Klucz prywatny twojej konfiguracji AuthRestore"
					},

					required: true,

					permission: null
				},
				{
					name: "roles",
					type: ApplicationCommandOptionType.Role,

					description: "The new roles for your AuthRestore config",
					description_localizations: {
						fr: "Le nouveau rôle pour votre configuration AuthRestore",
						ja: "AuthRestore設定の新しいロール",
						ru: "Новые роли для конфигурации AuthRestore",
						"es-ES":
							"Los nuevos roles para tu configuración AuthRestore",
						ko: "AuthRestore 설정의 새 역할",
						uk: "Нові ролі для вашої конфігурації AuthRestore",
						de: "Die neuen Rollen für deine AuthRestore-Konfiguration",
						it: "I nuovi ruoli per la tua configurazione AuthRestore",
						"pt-BR":
							"Os novos cargos para sua configuração AuthRestore",
						pl: "Nowe role dla twojej konfiguracji AuthRestore"
					},

					required: true,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],
	category: "authrestore",
	thinking: true,
	type: ApplicationCommandType.ChatInput,

	permission: null
};

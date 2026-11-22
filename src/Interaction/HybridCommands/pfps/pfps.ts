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
	name: "pfps",

	description: "Sending random user avatar in channel!",
	description_localizations: {
		fr: "Envoi d'un avatar d'utilisateur aléatoire dans un canal pré-définis",
		ja: "ランダムなユーザーアバターをチャンネルに送信！",
		ru: "Отправить случайный аватар в канал!",
		"es-ES": "Enviar avatar de usuario aleatorio en el canal!",
		ko: "채널에 무작위 사용자의 아바타를 보내요!",
		uk: "Надсилати випадкові аватари користувачів у канал!",
		de: "Sendet den Avatar eines zufälligen Mitglieds in den Kanal!",
		it: "Invia nel canale l'avatar di un utente a caso!",
		"pt-BR": "Envia no canal o avatar de um usuário aleatório!",
		pl: "Wysyła na kanał awatar losowego użytkownika!"
	},

	options: [
		{
			name: "channel",
			prefixName: "pfps-channel",

			description: "Set the pfps module's channel!",
			description_localizations: {
				fr: "Définir le canal du module pfps",
				ja: "PFPSモジュールのチャンネルを設定！",
				ru: "Установить канал модуля PFPS!",
				"es-ES": "Establecer el canal del módulo PFPS!",
				ko: "프로필 사진 모듈 채널을 설정해요!",
				uk: "Встановити канал модуля PFPS!",
				de: "Legt den Kanal des Profilbild-Moduls fest!",
				it: "Imposta il canale del modulo foto profilo!",
				"pt-BR": "Define o canal do módulo de fotos de perfil!",
				pl: "Ustawia kanał modułu zdjęć profilowych!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,

					description: "The channel!",
					description_localizations: {
						fr: "Le channel",
						ja: "チャンネル！",
						ru: "Канал!",
						"es-ES": "El canal!",
						ko: "채널!",
						uk: "Канал!",
						de: "Der Kanal!",
						it: "Il canale!",
						"pt-BR": "O canal!",
						pl: "Kanał!"
					},

					channel_types: [ChannelType.GuildText],

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "config",
			prefixName: "pfps-config",

			description: "Enable or Disable the PFPS module!",
			description_localizations: {
				fr: "Activer ou désactiver le module",
				ja: "PFPSモジュールを有効化または無効化！",
				ru: "Включить или отключить модуль PFPS!",
				"es-ES": "Habilitar o Deshabilitar el módulo PFPS!",
				ko: "PFPS 모듈을 켜거나 꺼요!",
				uk: "Увімкнути або вимкнути модуль PFPS!",
				de: "PFPS-Modul aktivieren oder deaktivieren!",
				it: "Attiva o disattiva il modulo PFPS!",
				"pt-BR": "Ative ou desative o módulo PFPS!",
				pl: "Włącz lub wyłącz moduł PFPS!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					required: true,
					choices: [
						{
							name: "Power On",
							name_localizations: {
								fr: "Activer",
								ja: "power_on",
								ru: "power_on",
								"es-ES": "power_on",
								ko: "켜기",
								uk: "Увімкнути",
								de: "Einschalten",
								it: "Attiva",
								"pt-BR": "Ligar",
								pl: "Włącz"
							},
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: {
								fr: "Désactiver",
								ja: "power_off",
								ru: "power_off",
								"es-ES": "power_off",
								ko: "끄기",
								uk: "Вимкнути",
								de: "Ausschalten",
								it: "Disattiva",
								"pt-BR": "Desligar",
								pl: "Wyłącz"
							},
							value: "off"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "pfps",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

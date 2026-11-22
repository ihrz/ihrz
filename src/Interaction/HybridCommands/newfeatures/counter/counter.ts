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

import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "counter",

	description: "Count number into a channel",
	description_localizations: {
		fr: "Compter les nombres dans un salon",
		ja: "チャンネル内でカウント",
		ru: "Считать число в канале",
		"es-ES": "Contar número en un canal",
		ko: "채널에서 숫자를 세요",
		uk: "Рахувати числа в каналі",
		de: "In einem Kanal zählen",
		it: "Conta i numeri in un canale",
		"pt-BR": "Contar números em um canal",
		pl: "Licz liczby na kanale"
	},

	options: [
		{
			name: "channel",
			prefixName: "counter-channel",

			description: "Set the counter module's channel!",
			description_localizations: {
				fr: "Définir le canal du module counter",
				ja: "カウンターモジュールのチャンネルを設定！",
				ru: "Установить канал модуля счетчика!",
				"es-ES": "Establecer el canal del módulo contador!",
				ko: "카운터 모듈 채널을 설정해요!",
				uk: "Встановити канал модуля лічильника!",
				de: "Legt den Kanal des Zähler-Moduls fest!",
				it: "Imposta il canale del modulo contatore!",
				"pt-BR": "Define o canal do módulo de contador!",
				pl: "Ustawia kanał modułu licznika!"
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
			prefixName: "counter-config",

			description: "Enable or Disable the counter module!",
			description_localizations: {
				fr: "Activer ou désactiver le module compteur",
				ja: "カウンターモジュールを有効化または無効化！",
				ru: "Включить или отключить модуль счетчика!",
				"es-ES": "Habilitar o Deshabilitar el módulo contador!",
				ko: "카운터 모듈을 켜거나 꺼요!",
				uk: "Увімкнути або вимкнути модуль лічильника!",
				de: "Zähler-Modul aktivieren oder deaktivieren!",
				it: "Attiva o disattiva il modulo contatore!",
				"pt-BR": "Ative ou desative o módulo de contador!",
				pl: "Włącz lub wyłącz moduł licznika!"
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
	category: "newfeatures",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

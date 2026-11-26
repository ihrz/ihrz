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
	Client,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "punishpub",

	description: "Punish user when he send too much advertisement!",
	description_localizations: {
		fr: "Punir l'utilisateur lorsqu'il envoie trop de publicité",
		ja: "広告を送りすぎたユーザーを罰する！",
		ru: "Наказать пользователя за чрезмерную рекламу!",
		"es-ES": "Castigar al usuario cuando envía demasiada publicidad!",
		ko: "광고를 너무 많이 보내는 사용자를 처벌해요!",
		uk: "Карати користувача за надмірну рекламу!",
		de: "Bestrafe Nutzer, die zu viel Werbung senden!",
		it: "Punisci l'utente che invia troppa pubblicità!",
		"pt-BR": "Puna o usuário que enviar propaganda demais!",
		pl: "Karz użytkownika za wysyłanie zbyt wielu reklam!"
	},

	options: [
		{
			name: "status",
			type: ApplicationCommandOptionType.String,

			description: "Choose the status of the module",
			description_localizations: {
				fr: "Choisir l'état du module",
				ja: "モジュールのステータスを選択",
				ru: "Выберите статус модуля",
				"es-ES": "Elegir el estado del módulo",
				ko: "모듈 상태 선택",
				uk: "Виберіть стан модуля",
				de: "Wähle den Status des Moduls",
				it: "Scegli lo stato del modulo",
				"pt-BR": "Escolha o status do módulo",
				pl: "Wybierz status modułu"
			},

			required: true,
			choices: [
				{
					name: "ON",
					name_localizations: {
						fr: "Activer",
						ja: "on",
						ru: "on",
						"es-ES": "on",
						ko: "켜기",
						uk: "УВІМК.",
						de: "AN",
						it: "ON",
						"pt-BR": "LIGADO",
						pl: "WŁ."
					},
					value: "true"
				},
				{
					name: "OFF",
					name_localizations: {
						fr: "Désactiver",
						ja: "off",
						ru: "off",
						"es-ES": "off",
						ko: "끄기",
						uk: "ВИМК.",
						de: "AUS",
						it: "OFF",
						"pt-BR": "DESLIGADO",
						pl: "WYŁ."
					},
					value: "false"
				}
			],

			permission: null
		},
		{
			name: "amount",
			type: ApplicationCommandOptionType.Number,

			description: "The max amount of flags before punishement",
			description_localizations: {
				fr: "Le nombre maximum de flags avant la punition",
				ja: "罰前の最大フラグ数",
				ru: "Максимальное количество флагов до наказания",
				"es-ES": "La cantidad máxima de marcas antes del castigo",
				ko: "처벌 전까지 허용할 최대 경고 횟수",
				uk: "Максимальна кількість позначок до покарання",
				de: "Maximale Anzahl Verstöße vor einer Strafe",
				it: "Numero massimo di segnalazioni prima della punizione",
				"pt-BR": "Número máximo de infrações antes da punição",
				pl: "Maksymalna liczba przewinień przed karą"
			},

			required: false,
			permission: null
		},
		{
			name: "punishement",
			type: ApplicationCommandOptionType.String,

			description: "Choose the punishement",
			description_localizations: {
				fr: "Choisir la punition",
				ja: "罰を選択",
				ru: "Выберите наказание",
				"es-ES": "Elegir el castigo",
				ko: "처벌 선택",
				uk: "Виберіть покарання",
				de: "Wähle die Strafe",
				it: "Scegli la punizione",
				"pt-BR": "Escolha a punição",
				pl: "Wybierz karę"
			},

			required: false,
			choices: [
				{
					name: "BAN",
					name_localizations: {
						fr: "Bannir",
						ja: "ban",
						ru: "ban",
						"es-ES": "ban",
						ko: "차단",
						uk: "БАН",
						de: "BAN",
						it: "BAN",
						"pt-BR": "BAN",
						pl: "BAN"
					},
					value: "ban"
				},
				{
					name: "KICK",
					name_localizations: {
						fr: "Expulser",
						ja: "kick",
						ru: "kick",
						"es-ES": "kick",
						ko: "추방",
						uk: "ВИГНАТИ",
						de: "KICK",
						it: "KICK",
						"pt-BR": "KICK",
						pl: "KICK"
					},
					value: "kick"
				},
				{
					name: "MUTE",
					name_localizations: {
						fr: "Muter",
						ja: "mute",
						ru: "mute",
						"es-ES": "mute",
						ko: "타임아웃",
						uk: "МУТ",
						de: "MUTE",
						it: "MUTE",
						"pt-BR": "MUTE",
						pl: "MUTE"
					},
					value: "mute"
				}
			],
			permission: null
		}
	],
	thinking: false,
	permission: PermissionFlagsBits.Administrator,
	category: "newfeatures",
	type: ApplicationCommandType.ChatInput,
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const action = interaction.options.getString("status");
		const amount = interaction.options.getNumber("amount");
		const punishment = interaction.options.getString("punishement");

		if (amount && action == "true") {
			if (amount > 50) {
				await client.func.method.interactionSend(interaction, {
					content: lang.punishpub_too_hight_enable
				});
				return;
			}
			if (amount < 0) {
				await client.func.method.interactionSend(interaction, {
					content: lang.punishpub_negative_number_enable
				});
				return;
			}
			if (amount == 0) {
				await client.func.method.interactionSend(interaction, {
					content: lang.punishpub_zero_number_enable
				});
				return;
			}

			await client.db.set(
				`${interaction.guildId}.GUILD.PUNISH.PUNISH_PUB`,
				{
					// The Nth flag sanctions (blockSpam compares with >=): amount - 1
					// sanctioned one early, and amount 1 stored 0, which never does.
					amountMax: amount,
					punishementType: punishment,
					state: action
				}
			);

			await client.func.ihorizon_logs(interaction, {
				title: lang.punishpub_logs_embed_title,
				description: lang.punishpub_logs_embed_description
					.replace("${authorId}", interaction.user.id)
					.replace("${amount}", amount.toString())
					.replace("${punishement}", punishment?.toString() as string)
			});

			await client.func.method.interactionSend(interaction, {
				content: lang.punishpub_confirmation_message_enable
					.replace("${authorId}", interaction.user.id)
					.replace("${amount}", amount.toString())
					.replace("${punishement}", punishment!)
			});
			return;
		} else {
			await client.db.delete(
				`${interaction.guildId}.GUILD.PUNISH.PUNISH_PUB`
			);
			await client.func.method.interactionSend(interaction, {
				content: lang.punishpub_confirmation_disable
			});

			await client.func.ihorizon_logs(interaction, {
				title: lang.punishpub_logs_embed_title_disable,
				description:
					lang.punishpub_logs_embed_description_disable.replace(
						"${authorId}",
						interaction.user.id
					)
			});

			return;
		}
	}
};

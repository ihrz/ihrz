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
	name: "confession",

	description: "Subcommand for confession category!",
	description_localizations: {
		fr: "Commande sous-groupé pour le module de confession",
		ja: "告白カテゴリのサブコマンド！",
		ru: "Подкоманда для категории признаний!",
		"es-ES": "Subcomando para la categoría de confesiones!",
		ko: "고백 하위 명령어!",
		uk: "Підкоманда категорії зізнань!",
		de: "Unterbefehle der Geständnis-Kategorie!",
		it: "Sottocomandi della categoria confessioni!",
		"pt-BR": "Subcomandos da categoria confissões!",
		pl: "Podkomendy kategorii wyznań!"
	},

	options: [
		{
			name: "panel",
			prefixName: "confess-panel",

			description:
				"Set up the confession module: channel, cooldown, threads, button and embed!",
			description_localizations: {
				fr: "Configurer les confessions : salon, délai, fils, bouton et embed",
				ja: "告白モジュールを設定：チャンネル、クールダウン、スレッド、ボタン、埋め込み！",
				ru: "Настроить признания: канал, задержка, ветки, кнопка и embed!",
				"es-ES":
					"Configura las confesiones: canal, espera, hilos, botón y embed!",
				ko: "고백 모듈 설정: 채널, 쿨다운, 스레드, 버튼, 임베드!",
				uk: "Налаштувати зізнання: канал, затримка, гілки, кнопка та embed!",
				de: "Geständnisse einrichten: Kanal, Wartezeit, Threads, Button und Embed!",
				it: "Configura le confessioni: canale, attesa, thread, pulsante ed embed!",
				"pt-BR":
					"Configure as confissões: canal, intervalo, tópicos, botão e embed!",
				pl: "Skonfiguruj wyznania: kanał, czas, wątki, przycisk i embed!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "delete",
			prefixName: "confess-delete",

			description: "Delete a confession!",
			description_localizations: {
				fr: "Supprimer une confession",
				ja: "告白を削除！",
				ru: "Удалить признание!",
				"es-ES": "Eliminar una confesión!",
				ko: "고백을 삭제해요!",
				uk: "Видалити зізнання!",
				de: "Lösche ein Geständnis!",
				it: "Elimina una confessione!",
				"pt-BR": "Exclua uma confissão!",
				pl: "Usuń wyznanie!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "code",
					type: ApplicationCommandOptionType.String,

					description: "The confession code",
					description_localizations: {
						fr: "Le code de la confession",
						ja: "告白コード",
						ru: "Код признания",
						"es-ES": "El código de la confesión",
						ko: "고백 코드",
						uk: "Код зізнання",
						de: "Der Geständnis-Code",
						it: "Il codice della confessione",
						"pt-BR": "O código da confissão",
						pl: "Kod wyznania"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "ban",
			prefixName: "confess-ban",

			description:
				"Ban the author of a confession from the module, without revealing them!",
			description_localizations: {
				fr: "Bannir du module l'auteur d'une confession, sans le révéler",
				ja: "告白の投稿者を明かさずにモジュールから追放！",
				ru: "Заблокировать автора признания, не раскрывая его!",
				"es-ES":
					"Banear del módulo al autor de una confesión, sin revelarlo!",
				ko: "고백 작성자를 공개하지 않고 모듈에서 차단해요!",
				uk: "Заблокувати автора зізнання в модулі, не розкриваючи його!",
				de: "Banne den Autor eines Geständnisses vom Modul, ohne ihn zu enttarnen!",
				it: "Banna dal modulo l'autore di una confessione, senza rivelarlo!",
				"pt-BR":
					"Bana do módulo o autor de uma confissão, sem revelá-lo!",
				pl: "Zbanuj autora wyznania w module, bez ujawniania go!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "code",
					type: ApplicationCommandOptionType.String,

					description: "The confession code",
					description_localizations: {
						fr: "Le code de la confession",
						ja: "告白コード",
						ru: "Код признания",
						"es-ES": "El código de la confesión",
						ko: "고백 코드",
						uk: "Код зізнання",
						de: "Der Geständnis-Code",
						it: "Il codice della confessione",
						"pt-BR": "O código da confissão",
						pl: "Kod wyznania"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		},
		{
			name: "unban",
			prefixName: "confess-unban",

			description:
				"Lift a ban, using the code of the confession that caused it!",
			description_localizations: {
				fr: "Lever un bannissement, avec le code de la confession concernée",
				ja: "原因となった告白コードで追放を解除！",
				ru: "Снять блокировку по коду признания!",
				"es-ES": "Levantar un baneo con el código de la confesión!",
				ko: "차단의 원인이 된 고백 코드로 차단을 해제해요!",
				uk: "Зняти бан за кодом зізнання, через яке його було накладено!",
				de: "Hebe einen Bann mit dem Code des auslösenden Geständnisses auf!",
				it: "Revoca un ban usando il codice della confessione che l'ha causato!",
				"pt-BR":
					"Revogue um banimento usando o código da confissão que o causou!",
				pl: "Zdejmij bana, używając kodu wyznania, które go wywołało!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "code",
					type: ApplicationCommandOptionType.String,

					description: "The confession code",
					description_localizations: {
						fr: "Le code de la confession",
						ja: "告白コード",
						ru: "Код признания",
						"es-ES": "El código de la confesión",
						ko: "고백 코드",
						uk: "Код зізнання",
						de: "Der Geständnis-Code",
						it: "Il codice della confessione",
						"pt-BR": "O código da confissão",
						pl: "Kod wyznania"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ModerateMembers
		}
	],
	thinking: false,
	category: "confession",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

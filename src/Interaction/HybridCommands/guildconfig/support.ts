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
	PermissionsBitField,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message,
	Role
} from "discord.js";

import { Command } from "../../../../types/command.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { refreshSupportRoles } from "../../../core/modules/supportRole.js";
import { notice, sendCard } from "../../../core/modules/uiCard.js";

export const command: Command = {
	name: "support",
	name_localizations: {
		fr: "soutien",
		ja: "support",
		ru: "support",
		"es-ES": "support",
		ko: "support",
		uk: "support",
		de: "support",
		it: "support",
		"pt-BR": "support",
		pl: "support"
	},

	description:
		"Give a roles when guild's member have something about your server on them bio!",
	description_localizations: {
		fr: "Donnez un rôle lorsque les membres de la guilde ont quelque chose sur votre serveur dans leur bio",
		ja: "サーバーメンバーの自己紹介にサーバーに関する情報がある場合にロールを付与！",
		ru: "Выдать роли, если у участника в описании есть информация о сервере!",
		"es-ES":
			"Dar roles cuando el miembro del servidor tiene algo sobre tu servidor en su biografía!",
		ko: "소개에 서버 관련 내용이 있는 멤버에게 역할을 부여해요!",
		uk: "Видавати роль учасникам, які згадують ваш сервер у своїй біографії!",
		de: "Gib eine Rolle, wenn die Bio eines Mitglieds etwas über deinen Server enthält!",
		it: "Assegna un ruolo se la bio di un membro parla del tuo server!",
		"pt-BR": "Dê um cargo quando a bio de um membro citar o seu servidor!",
		pl: "Nadaj rolę, gdy opis członka zawiera coś o twoim serwerze!"
	},

	aliases: ["soutien"],

	options: [
		{
			name: "action",
			type: ApplicationCommandOptionType.String,

			description: "Choose the action",
			description_localizations: {
				fr: "Quelle action voulez-vous ?",
				ja: "アクションを選択",
				ru: "Выберите действие",
				"es-ES": "Elegir la acción",
				ko: "작업 선택",
				uk: "Оберіть дію",
				de: "Wähle die Aktion",
				it: "Scegli l'azione",
				"pt-BR": "Escolha a ação",
				pl: "Wybierz akcję"
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
		},
		{
			name: "type",
			type: ApplicationCommandOptionType.String,

			description: "What's type of input you user have to?",
			description_localizations: {
				fr: "Quel type d'entrer l'utilisateur doit avoir?",
				ja: "ユーザーが入力するタイプは？",
				ru: "Какой тип ввода у пользователя?",
				"es-ES": "Que tipo de entrada tiene el usuario?",
				ko: "사용자가 입력할 방식은 무엇인가요?",
				uk: "Що саме має бути в учасника?",
				de: "Welche Art von Eingabe sollen Mitglieder machen?",
				it: "Che tipo di input devono inserire gli utenti?",
				"pt-BR": "Que tipo de entrada os usuários devem fornecer?",
				pl: "Jakiego typu dane mają podać użytkownicy?"
			},

			choices: [
				{
					name: "Something in the bio",
					name_localizations: {
						fr: "Quelques choses dans la bio",
						ja: "something_in_the_bio",
						ru: "something_in_the_bio",
						"es-ES": "something_in_the_bio",
						ko: "소개에 들어간 내용",
						uk: "Щось у біографії",
						de: "Etwas in der Bio",
						it: "Qualcosa nella bio",
						"pt-BR": "Algo na bio",
						pl: "Coś w biogramie"
					},
					value: "bio"
				},
				{
					name: "The guild tag (Boost perks)",
					name_localizations: {
						fr: "Le tag du serveur sur sont profil (Activable via des boosts)",
						ja: "the_guild_tag_boost_perks",
						ru: "the_guild_tag_boost_perks",
						"es-ES": "the_guild_tag_boost_perks",
						ko: "서버 태그 (부스트 혜택)",
						uk: "Тег сервера (переваги буста)",
						de: "Der Server-Tag (Boost-Vorteile)",
						it: "Il tag del server (vantaggi Boost)",
						"pt-BR": "A tag do servidor (benefícios de Boost)",
						pl: "Tag serwera (korzyści z boostów)"
					},
					value: "tag"
				},
				{
					name: "Both: the bio and the guild tag",
					name_localizations: {
						fr: "Les deux : la bio et le tag du serveur",
						ja: "両方：ステータスとサーバータグ",
						ru: "Оба: статус и тег сервера",
						"es-ES":
							"Ambos: la biografía y la etiqueta del servidor",
						ko: "둘 다: 소개와 서버 태그",
						uk: "Обидва: біографія і тег сервера",
						de: "Beides: Bio und Server-Tag",
						it: "Entrambi: la bio e il tag del server",
						"pt-BR": "Os dois: a bio e a tag do servidor",
						pl: "Oba: biogram i tag serwera"
					},
					value: "both"
				},
				{
					name: "One of the two: the bio or the guild tag",
					name_localizations: {
						fr: "L'un des deux : la bio ou le tag du serveur",
						ja: "どちらか：ステータスまたはサーバータグ",
						ru: "Одно из двух: статус или тег сервера",
						"es-ES":
							"Uno de los dos: la biografía o la etiqueta del servidor",
						ko: "둘 중 하나: 소개 또는 서버 태그",
						uk: "Одне з двох: біографія або тег сервера",
						de: "Eins von beiden: Bio oder Server-Tag",
						it: "Uno dei due: la bio o il tag del server",
						"pt-BR": "Um dos dois: a bio ou a tag do servidor",
						pl: "Jedno z dwóch: biogram lub tag serwera"
					},
					value: "either"
				}
			],

			permission: null,
			required: true
		},
		{
			name: "roles",
			type: ApplicationCommandOptionType.Role,
			description: "The roles to give for our member",
			description_localizations: {
				fr: "Les rôles à donner à vos membre",
				ja: "メンバーに付与するロール",
				ru: "Роли для выдачи участнику",
				"es-ES": "Los roles a dar a nuestro miembro",
				ko: "멤버에게 지급할 역할",
				uk: "Ролі, які видаються учасникам",
				de: "Die Rollen, die unser Mitglied erhält",
				it: "I ruoli da dare al nostro membro",
				"pt-BR": "Os cargos a dar ao nosso membro",
				pl: "Role dla naszego członka"
			},

			required: false,

			permission: null
		},
		{
			name: "input",
			type: ApplicationCommandOptionType.String,

			description: "Choose the keywords wanted in the bio",
			description_localizations: {
				fr: "Choisissez les mots-clés voulue dans la bio",
				ja: "自己紹介に含めたいキーワードを選択",
				ru: "Выберите ключевые слова для описания",
				"es-ES": "Elegir las palabras clave deseadas en la biografía",
				ko: "소개에 포함되어야 할 키워드 선택",
				uk: "Оберіть ключові слова для біографії",
				de: "Wähle die gewünschten Schlüsselwörter in der Bio",
				it: "Scegli le parole chiave volute nella bio",
				"pt-BR": "Escolha as palavras-chave desejadas na bio",
				pl: "Wybierz słowa kluczowe wymagane w opisie"
			},

			required: false,

			permission: null
		}
	],
	thinking: false,
	category: "guildconfig",
	permission: PermissionsBitField.Flags.Administrator,
	type: ApplicationCommandType.ChatInput,
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing

		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const opts = client.func.method.options(interaction, args);
		const action = opts.string("action", 0, true);
		const type = opts.string("type", 1);
		const roles = opts.role("roles", 2) as Role | null;
		let input = opts.longString("input", 3);

		if (action == "on") {
			if (!roles) {
				await client.func.method.interactionSend(interaction, {
					content: lang.support_command_not_role
				});
				return;
			}

			if (!type) {
				await client.func.method.interactionSend(interaction, {
					content: lang.support_command_not_type
				});
				return;
			}

			if (
				(type === "tag" || type === "both") &&
				!interaction.guild.features.includes("GUILD_TAGS")
			) {
				await client.func.method.interactionSend(interaction, {
					content: lang.support_command_guild_not_have_tag
				});
				return;
			}

			if (type === "tag") input = null;

			const config: DatabaseStructure.SupportSchema = {
				rolesId: roles.id,
				state: action,
				type: (type as DatabaseStructure.SupportType) || "tag",
				input
			};

			await client.db.set(`${interaction.guildId}.GUILD.SUPPORT`, config);
			// Members whose status already matches get the role now, not at
			// their next status change.
			void refreshSupportRoles(interaction.guild, config);

			const template =
				type === "tag"
					? lang.support_command_work_2
					: type === "both"
						? lang.support_command_work_both
						: type === "either"
							? lang.support_command_work_either
							: lang.support_command_work;
			// No keyword: the server's vanity code is what is looked for.
			const keyword =
				input?.trim() ||
				(interaction.guild.vanityURLCode
					? `discord.gg/${interaction.guild.vanityURLCode}`
					: "—");
			const Message: string = template
				.replace("${guildName}", interaction.guild.name)
				.replace("${input}", keyword)
				.replace("${rolesId}", roles.id);

			await sendCard(client, interaction, notice("success", Message));
		} else {
			await client.db.delete(`${interaction.guildId}.GUILD.SUPPORT`);

			await sendCard(
				client,
				interaction,
				notice(
					"success",
					lang.support_command_work_on_disable.replace(
						"${guildName}",
						interaction.guild.name
					)
				)
			);
			return;
		}
	}
};

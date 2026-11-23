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

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "profil",

	description: "Subcommand for profil category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de visualisation profil",
		ja: "プロフィールカテゴリのサブコマンド！",
		ru: "Подкоманда для категории профиля!",
		"es-ES": "Subcomando para la categoría de perfil!",
		ko: "프로필 하위 명령어!",
		uk: "Підкоманда категорії профілю!",
		de: "Unterbefehle der Profil-Kategorie!",
		it: "Sottocomandi della categoria profilo!",
		"pt-BR": "Subcomandos da categoria perfil!",
		pl: "Podkomendy kategorii profilu!"
	},

	options: [
		{
			name: "show",
			name_localizations: {
				fr: "afficher",
				ja: "show",
				ru: "show",
				"es-ES": "show",
				ko: "show",
				uk: "show",
				de: "show",
				it: "show",
				"pt-BR": "show",
				pl: "show"
			},

			description: "See the iHorizon's profil of the member!",
			description_localizations: {
				fr: "Voir le profil iHorizon du membre",
				ja: "メンバーのiHorizonプロフィールを表示！",
				ru: "Посмотреть профиль iHorizon участника!",
				"es-ES": "Ver el perfil de iHorizon del miembro!",
				ko: "멤버의 iHorizon 프로필을 확인해요!",
				uk: "Переглянути профіль учасника в iHorizon!",
				de: "Zeigt das iHorizon-Profil des Mitglieds!",
				it: "Mostra il profilo iHorizon del membro!",
				"pt-BR": "Mostra o perfil iHorizon do membro!",
				pl: "Pokazuje profil iHorizon członka!"
			},

			aliases: ["me", "prof"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to lookup",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez rechercher",
						ja: "検索したいユーザー",
						ru: "Пользователь для поиска",
						"es-ES": "El usuario que quieres buscar",
						ko: "조회할 사용자",
						uk: "Користувач, якого ви хочете переглянути",
						de: "Das Mitglied, das du nachschlagen willst",
						it: "L'utente da cercare",
						"pt-BR": "O usuário que você quer consultar",
						pl: "Użytkownik do sprawdzenia"
					},

					required: false,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-age",
			name_localizations: {
				fr: "définir-âge",
				ja: "set-age",
				ru: "set-age",
				"es-ES": "set-age",
				ko: "set-age",
				uk: "set-age",
				de: "set-age",
				it: "set-age",
				"pt-BR": "set-age",
				pl: "set-age"
			},

			description: "Set your age on the iHorizon's Profil !",
			description_localizations: {
				fr: "Définissez votre âge sur le profil iHorizon",
				ja: "iHorizonプロフィールに年齢を設定！",
				ru: "Установить возраст в профиле iHorizon!",
				"es-ES": "Establecer tu edad en el perfil de iHorizon!",
				ko: "iHorizon 프로필에 나이를 설정해요!",
				uk: "Вказати свій вік у профілі iHorizon!",
				de: "Legt dein Alter im iHorizon-Profil fest!",
				it: "Imposta la tua età nel profilo iHorizon!",
				"pt-BR": "Define sua idade no perfil iHorizon!",
				pl: "Ustawia twój wiek w profilu iHorizon!"
			},

			aliases: ["age"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "age",
					type: ApplicationCommandOptionType.Number,

					description: "Your age on the iHorizon's profil",
					description_localizations: {
						fr: "Votre âge sur votre profil iHorizon",
						ja: "iHorizonプロフィールの年齢",
						ru: "Ваш возраст в профиле iHorizon",
						"es-ES": "Tu edad en el perfil de iHorizon",
						ko: "iHorizon 프로필의 나이",
						uk: "Ваш вік у профілі iHorizon",
						de: "Dein Alter im iHorizon-Profil",
						it: "La tua età nel profilo iHorizon",
						"pt-BR": "Sua idade no perfil iHorizon",
						pl: "Twój wiek w profilu iHorizon"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-description",
			name_localizations: {
				fr: "définir-description",
				ja: "set-description",
				ru: "set-description",
				"es-ES": "set-description",
				ko: "set-description",
				uk: "set-description",
				de: "set-description",
				it: "set-description",
				"pt-BR": "set-description",
				pl: "set-description"
			},

			description: "Set your description on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre description sur le profil iHorizon",
				ja: "iHorizonプロフィールに説明を設定！",
				ru: "Установить описание в профиле iHorizon!",
				"es-ES": "Establecer tu descripción en el perfil de iHorizon!",
				ko: "iHorizon 프로필에 소개를 설정해요!",
				uk: "Вказати свій опис у профілі iHorizon!",
				de: "Legt deine Beschreibung im iHorizon-Profil fest!",
				it: "Imposta la tua descrizione nel profilo iHorizon!",
				"pt-BR": "Define sua descrição no perfil iHorizon!",
				pl: "Ustawia twój opis w profilu iHorizon!"
			},

			aliases: ["desc", "description"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "description",
					type: ApplicationCommandOptionType.String,

					description: "Your descriptions on the iHorizon's profil",
					description_localizations: {
						fr: "La description sur votre profil",
						ja: "iHorizonプロフィールの説明",
						ru: "Ваше описание в профиле iHorizon",
						"es-ES": "Tu descripción en el perfil de iHorizon",
						ko: "iHorizon 프로필의 소개",
						uk: "Ваш опис у профілі iHorizon",
						de: "Deine Beschreibung im iHorizon-Profil",
						it: "La tua descrizione nel profilo iHorizon",
						"pt-BR": "Sua descrição no perfil iHorizon",
						pl: "Twój opis w profilu iHorizon"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-gender",
			name_localizations: {
				fr: "définir-genre",
				ja: "set-gender",
				ru: "set-gender",
				"es-ES": "set-gender",
				ko: "set-gender",
				uk: "set-gender",
				de: "set-gender",
				it: "set-gender",
				"pt-BR": "set-gender",
				pl: "set-gender"
			},

			description: "Set your gender on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre genre sur le profil iHorizon",
				ja: "iHorizonプロフィールに性別を設定！",
				ru: "Установить пол в профиле iHorizon!",
				"es-ES": "Establecer tu género en el perfil de iHorizon!",
				ko: "iHorizon 프로필에 성별을 설정해요!",
				uk: "Вказати свою стать у профілі iHorizon!",
				de: "Legt dein Geschlecht im iHorizon-Profil fest!",
				it: "Imposta il tuo genere nel profilo iHorizon!",
				"pt-BR": "Define seu gênero no perfil iHorizon!",
				pl: "Ustawia twoją płeć w profilu iHorizon!"
			},

			aliases: ["gender"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "gender",
					type: ApplicationCommandOptionType.String,

					description: "Gender that fits you the most",
					description_localizations: {
						fr: "Le genre qui vous correspond le plus",
						ja: "最も合う性別",
						ru: "Пол, который вам подходит",
						"es-ES": "Género que más te queda",
						ko: "나에게 가장 잘 맞는 성별",
						uk: "Стать, що вам найбільше підходить",
						de: "Das Geschlecht, das am besten zu dir passt",
						it: "Il genere che ti rappresenta di più",
						"pt-BR": "O gênero que mais combina com você",
						pl: "Płeć, która najbardziej do ciebie pasuje"
					},

					required: true,
					choices: [
						{
							name: "♀ Female",
							name_localizations: {
								fr: "♀ Féminin",
								ja: "female",
								ru: "female",
								"es-ES": "female",
								ko: "♀ 여성",
								uk: "♀ Жіноча",
								de: "♀ Weiblich",
								it: "♀ Femmina",
								"pt-BR": "♀ Feminino",
								pl: "♀ Kobieta"
							},
							value: "female"
						},
						{
							name: "♂ Male",
							name_localizations: {
								fr: "♂ Masculin",
								ja: "male",
								ru: "male",
								"es-ES": "male",
								ko: "♂ 남성",
								uk: "♂ Чоловіча",
								de: "♂ Männlich",
								it: "♂ Maschio",
								"pt-BR": "♂ Masculino",
								pl: "♂ Mężczyzna"
							},
							value: "male"
						},
						{
							name: "⚧ Non-binary",
							name_localizations: {
								fr: "⚧ Non-binaire",
								ja: "non-binary",
								ru: "non-binary",
								"es-ES": "non-binary",
								ko: "⚧ 논바이너리",
								uk: "⚧ Небінарна",
								de: "⚧ Nicht-binär",
								it: "⚧ Non binario",
								"pt-BR": "⚧ Não binário",
								pl: "⚧ Niebinarna"
							},
							value: "non-binary"
						}
					],

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-pronoun",
			name_localizations: {
				fr: "définir-pronom",
				ja: "set-pronoun",
				ru: "set-pronoun",
				"es-ES": "set-pronoun",
				ko: "set-pronoun",
				uk: "set-pronoun",
				de: "set-pronoun",
				it: "set-pronoun",
				"pt-BR": "set-pronoun",
				pl: "set-pronoun"
			},

			description: "Set your pronoun on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre pronom sur le profil iHorizon",
				ja: "iHorizonプロフィールに代名詞を設定！",
				ru: "Установить местоимение в профиле iHorizon!",
				"es-ES": "Establecer tu pronombre en el perfil de iHorizon!",
				ko: "iHorizon 프로필에 대명사를 설정해요!",
				uk: "Вказати свій займенник у профілі iHorizon!",
				de: "Legt deine Pronomen im iHorizon-Profil fest!",
				it: "Imposta i tuoi pronomi nel profilo iHorizon!",
				"pt-BR": "Define seus pronomes no perfil iHorizon!",
				pl: "Ustawia twoje zaimki w profilu iHorizon!"
			},

			aliases: ["pronoun", "pronom"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "pronoun",
					type: ApplicationCommandOptionType.String,

					description: "Pronoun that fits you the most",
					description_localizations: {
						fr: "Le pronom qui vous correspond le plus",
						ja: "最も合う代名詞",
						ru: "Местоимение, которое вам подходит",
						"es-ES": "Pronombre que más te queda",
						ko: "나에게 가장 잘 맞는 대명사",
						uk: "Займенник, що вам найбільше підходить",
						de: "Das Pronomen, das am besten zu dir passt",
						it: "Il pronome che ti rappresenta di più",
						"pt-BR": "O pronome que mais combina com você",
						pl: "Zaimek, który najbardziej do ciebie pasuje"
					},

					required: true,
					choices: [
						{
							name: "she/her",
							name_localizations: {
								fr: "elle/elle",
								ja: "she_her",
								ru: "she_her",
								"es-ES": "she_her",
								ko: "그녀 (she/her)",
								uk: "вона/її",
								de: "sie/ihr",
								it: "lei/lei",
								"pt-BR": "ela/dela",
								pl: "ona/jej"
							},
							value: "she-her"
						},
						{
							name: "he/him",
							name_localizations: {
								fr: "il/il",
								ja: "he_him",
								ru: "he_him",
								"es-ES": "he_him",
								ko: "그 (he/him)",
								uk: "він/його",
								de: "er/ihm",
								it: "lui/lui",
								"pt-BR": "ele/dele",
								pl: "on/jego"
							},
							value: "he-him"
						},
						{
							name: "they/them",
							name_localizations: {
								fr: "ils/ils",
								ja: "they_them",
								ru: "they_them",
								"es-ES": "they_them",
								ko: "그들 (they/them)",
								uk: "вони/їх",
								de: "they/them",
								it: "loro/loro",
								"pt-BR": "elu/delu",
								pl: "oni/ich"
							},
							value: "they-them"
						},
						{
							name: "xe/xem",
							name_localizations: {
								fr: "xe/xe",
								ja: "xe_xem",
								ru: "xe_xem",
								"es-ES": "xe_xem",
								ko: "xe/xem",
								uk: "xe/xem",
								de: "xe/xem",
								it: "xe/xem",
								"pt-BR": "xe/xem",
								pl: "xe/xem"
							},
							value: "xe-xem"
						},
						{
							name: "ze/zem",
							name_localizations: {
								fr: "ze/ze",
								ja: "ze_zem",
								ru: "ze_zem",
								"es-ES": "ze_zem",
								ko: "ze/zem",
								uk: "ze/zem",
								de: "ze/zem",
								it: "ze/zem",
								"pt-BR": "ze/zem",
								pl: "ze/zem"
							},
							value: "ze-zem"
						},
						{
							name: "other (say my name)",
							name_localizations: {
								fr: "autre (dire mon nom)",
								ja: "other_say_my_name",
								ru: "other_say_my_name",
								"es-ES": "other_say_my_name",
								ko: "기타 (이름으로 불러 주세요)",
								uk: "інше (називати на ім'я)",
								de: "Andere (sag meinen Namen)",
								it: "Altro (dì il mio nome)",
								"pt-BR": "Outro (diga meu nome)",
								pl: "Inna (powiedz moje imię)"
							},
							value: "other"
						}
					],

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-birthday",
			name_localizations: {
				fr: "définir-anniversaire",
				ja: "set-birthday",
				ru: "set-birthday",
				"es-ES": "set-birthday",
				ko: "set-birthday",
				uk: "set-birthday",
				de: "set-birthday",
				it: "set-birthday",
				"pt-BR": "set-birthday",
				pl: "set-birthday"
			},

			description: "Set your birthday on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre anniversaire sur le profil iHorizon",
				ja: "iHorizonプロフィールに誕生日を設定！",
				ru: "Установить день рождения в профиле iHorizon!",
				"es-ES": "Establecer tu cumpleaños en el perfil de iHorizon!",
				ko: "iHorizon 프로필에 생일을 설정해요!",
				uk: "Вказати свій день народження в профілі iHorizon!",
				de: "Legt deinen Geburtstag im iHorizon-Profil fest!",
				it: "Imposta il tuo compleanno nel profilo iHorizon!",
				"pt-BR": "Define seu aniversário no perfil iHorizon!",
				pl: "Ustawia twoje urodziny w profilu iHorizon!"
			},

			aliases: ["birthday", "anniversaire"],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		}
	],
	integration_types: [0, 1],
	contexts: [0, 1, 2],

	thinking: false,
	category: "profil",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

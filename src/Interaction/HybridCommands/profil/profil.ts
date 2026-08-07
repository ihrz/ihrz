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
		"es-ES": "Subcomando para la categoría de perfil!"
	},

	options: [
		{
			name: "show",
			name_localizations: {
				fr: "afficher",
				ja: "show",
				ru: "show",
				"es-ES": "show"
			},

			description: "See the iHorizon's profil of the member!",
			description_localizations: {
				fr: "Voir le profil iHorizon du membre",
				ja: "メンバーのiHorizonプロフィールを表示！",
				ru: "Посмотреть профиль iHorizon участника!",
				"es-ES": "Ver el perfil de iHorizon del miembro!"
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
						"es-ES": "El usuario que quieres buscar"
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
				"es-ES": "set-age"
			},

			description: "Set your age on the iHorizon's Profil !",
			description_localizations: {
				fr: "Définissez votre âge sur le profil iHorizon",
				ja: "iHorizonプロフィールに年齢を設定！",
				ru: "Установить возраст в профиле iHorizon!",
				"es-ES": "Establecer tu edad en el perfil de iHorizon!"
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
						"es-ES": "Tu edad en el perfil de iHorizon"
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
				"es-ES": "set-description"
			},

			description: "Set your description on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre description sur le profil iHorizon",
				ja: "iHorizonプロフィールに説明を設定！",
				ru: "Установить описание в профиле iHorizon!",
				"es-ES": "Establecer tu descripción en el perfil de iHorizon!"
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
						"es-ES": "Tu descripción en el perfil de iHorizon"
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
				"es-ES": "set-gender"
			},

			description: "Set your gender on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre genre sur le profil iHorizon",
				ja: "iHorizonプロフィールに性別を設定！",
				ru: "Установить пол в профиле iHorizon!",
				"es-ES": "Establecer tu género en el perfil de iHorizon!"
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
						"es-ES": "Género que más te queda"
					},

					required: true,
					choices: [
						{
							name: "♀ Female",
							name_localizations: {
								fr: "♀ Féminin",
								ja: "female",
								ru: "female",
								"es-ES": "female"
							},
							value: "female"
						},
						{
							name: "♂ Male",
							name_localizations: {
								fr: "♂ Masculin",
								ja: "male",
								ru: "male",
								"es-ES": "male"
							},
							value: "male"
						},
						{
							name: "⚧ Non-binary",
							name_localizations: {
								fr: "⚧ Non-binaire",
								ja: "non-binary",
								ru: "non-binary",
								"es-ES": "non-binary"
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
				"es-ES": "set-pronoun"
			},

			description: "Set your pronoun on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre pronom sur le profil iHorizon",
				ja: "iHorizonプロフィールに代名詞を設定！",
				ru: "Установить местоимение в профиле iHorizon!",
				"es-ES": "Establecer tu pronombre en el perfil de iHorizon!"
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
						"es-ES": "Pronombre que más te queda"
					},

					required: true,
					choices: [
						{
							name: "she/her",
							name_localizations: {
								fr: "elle/elle",
								ja: "she_her",
								ru: "she_her",
								"es-ES": "she_her"
							},
							value: "she-her"
						},
						{
							name: "he/him",
							name_localizations: {
								fr: "il/il",
								ja: "he_him",
								ru: "he_him",
								"es-ES": "he_him"
							},
							value: "he-him"
						},
						{
							name: "they/them",
							name_localizations: {
								fr: "ils/ils",
								ja: "they_them",
								ru: "they_them",
								"es-ES": "they_them"
							},
							value: "they-them"
						},
						{
							name: "xe/xem",
							name_localizations: {
								fr: "xe/xe",
								ja: "xe_xem",
								ru: "xe_xem",
								"es-ES": "xe_xem"
							},
							value: "xe-xem"
						},
						{
							name: "ze/zem",
							name_localizations: {
								fr: "ze/ze",
								ja: "ze_zem",
								ru: "ze_zem",
								"es-ES": "ze_zem"
							},
							value: "ze-zem"
						},
						{
							name: "other (say my name)",
							name_localizations: {
								fr: "autre (dire mon nom)",
								ja: "other_say_my_name",
								ru: "other_say_my_name",
								"es-ES": "other_say_my_name"
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
				"es-ES": "set-birthday"
			},

			description: "Set your birthday on the iHorizon's Profil!",
			description_localizations: {
				fr: "Définissez votre anniversaire sur le profil iHorizon",
				ja: "iHorizonプロフィールに誕生日を設定！",
				ru: "Установить день рождения в профиле iHorizon!",
				"es-ES": "Establecer tu cumpleaños en el perfil de iHorizon!"
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

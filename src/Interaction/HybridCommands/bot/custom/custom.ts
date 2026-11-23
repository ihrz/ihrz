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

import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "custom",

	description: "Custom the bot profile in your discord server",
	description_localizations: {
		fr: "Customiser le profil du bot sur le serveur Discord",
		ja: "Discordサーバーでボットのプロフィールをカスタマイズ",
		ru: "Настроить профиль бота на вашем сервере",
		"es-ES": "Personalizar el perfil del bot en tu servidor de Discord",
		ko: "Discord 서버에서 봇 프로필을 꾸며요",
		uk: "Налаштувати профіль бота на вашому сервері Discord",
		de: "Passe das Bot-Profil auf deinem Discord-Server an",
		it: "Personalizza il profilo del bot nel tuo server Discord",
		"pt-BR": "Personalize o perfil do bot no seu servidor do Discord",
		pl: "Dostosuj profil bota na swoim serwerze Discord"
	},

	options: [
		{
			name: "name",
			prefixName: "botname",
			aliases: ["setname", "setbotname"],

			description: "Change the iHorizon name into the server",
			description_localizations: {
				fr: "Définir le nom du bot sur le serveur",
				ja: "サーバーのiHorizonの名前を変更",
				ru: "Изменить имя iHorizon на сервере",
				"es-ES": "Cambiar el nombre de iHorizon en el servidor",
				ko: "서버에서 iHorizon의 이름을 변경해요",
				uk: "Змінити ім'я iHorizon на сервері",
				de: "Ändere den iHorizon-Namen auf dem Server",
				it: "Cambia il nome di iHorizon nel server",
				"pt-BR": "Altere o nome do iHorizon no servidor",
				pl: "Zmień nazwę iHorizon na serwerze"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					choices: [
						{
							name: "Default Bot Name",
							name_localizations: {
								fr: "Reprendre le nom par défaut du bot",
								ja: "ボットのデフォルトの名前に戻す",
								ru: "Восстановить имя бота по умолчанию",
								"es-ES":
									"Restablecer el nombre predeterminado del bot",
								ko: "기본 봇 이름",
								uk: "Типове ім'я бота",
								de: "Standard-Bot-Name",
								it: "Nome predefinito del bot",
								"pt-BR": "Nome padrão do bot",
								pl: "Domyślna nazwa bota"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir un nom",
								ja: "名前を設定",
								ru: "Задать имя",
								"es-ES": "Establecer un nombre",
								ko: "하나 설정",
								uk: "Задати своє",
								de: "Eines festlegen",
								it: "Imposta uno",
								"pt-BR": "Definir um",
								pl: "Ustaw jeden"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "name",

					description: "The name",
					description_localizations: {
						fr: "Le nom du bot",
						ja: "名前",
						ru: "Имя",
						"es-ES": "El nombre",
						ko: "이름",
						uk: "Ім'я",
						de: "Der Name",
						it: "Il nome",
						"pt-BR": "O nome",
						pl: "Nazwa"
					},

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "avatar",
			prefixName: "botavatar",
			aliases: ["setpic", "setavatar", "setpp"],

			description: "Change the iHorizon avatar into your server",
			description_localizations: {
				fr: "Définir la photo de profil du bot sur votre serveur discord",
				ja: "サーバーのiHorizonアバターを変更",
				ru: "Изменить аватар iHorizon на сервере",
				"es-ES": "Cambiar el avatar de iHorizon en tu servidor",
				ko: "서버에서 iHorizon의 아바타를 변경해요",
				uk: "Змінити аватар iHorizon на вашому сервері",
				de: "Ändere den iHorizon-Avatar auf deinem Server",
				it: "Cambia l'avatar di iHorizon nel tuo server",
				"pt-BR": "Altere o avatar do iHorizon no seu servidor",
				pl: "Zmień awatar iHorizon na swoim serwerze"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					choices: [
						{
							name: "Default Bot Avatar",
							name_localizations: {
								fr: "Reprendre l'avatar par défaut du bot",
								ja: "ボットのデフォルトアバターに戻す",
								ru: "Восстановить аватар бота по умолчанию",
								"es-ES":
									"Restablecer el avatar predeterminado del bot",
								ko: "기본 봇 아바타",
								uk: "Типовий аватар бота",
								de: "Standard-Bot-Avatar",
								it: "Avatar predefinito del bot",
								"pt-BR": "Avatar padrão do bot",
								pl: "Domyślny awatar bota"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir un avatar",
								ja: "アバターを設定",
								ru: "Задать аватар",
								"es-ES": "Establecer un avatar",
								ko: "하나 설정",
								uk: "Задати своє",
								de: "Eines festlegen",
								it: "Imposta uno",
								"pt-BR": "Definir um",
								pl: "Ustaw jeden"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "avatar",

					description: "The avatar",
					description_localizations: {
						fr: "L'avatar du bot",
						ja: "アバター",
						ru: "Аватар",
						"es-ES": "El avatar",
						ko: "아바타",
						uk: "Аватар",
						de: "Der Avatar",
						it: "L'avatar",
						"pt-BR": "O avatar",
						pl: "Awatar"
					},

					type: ApplicationCommandOptionType.Attachment,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "banner",
			prefixName: "botbanner",

			aliases: ["setbotbanner", "setbanner"],

			description: "Change the iHorizon banner into your server",
			description_localizations: {
				fr: "Définir la bannière de profil du bot sur votre serveur discord",
				ja: "サーバーのiHorizonバナーを変更",
				ru: "Изменить баннер iHorizon на сервере",
				"es-ES": "Cambiar el banner de iHorizon en tu servidor",
				ko: "서버에서 iHorizon의 배너를 변경해요",
				uk: "Змінити банер iHorizon на вашому сервері",
				de: "Ändere das iHorizon-Banner auf deinem Server",
				it: "Cambia il banner di iHorizon nel tuo server",
				"pt-BR": "Altere o banner do iHorizon no seu servidor",
				pl: "Zmień baner iHorizon na swoim serwerze"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					choices: [
						{
							name: "Default Bot Banner",
							name_localizations: {
								fr: "Reprendre la bannière par défaut du bot",
								ja: "ボットのデフォルトバナーに戻す",
								ru: "Восстановить баннер бота по умолчанию",
								"es-ES":
									"Restablecer el banner predeterminado del bot",
								ko: "기본 봇 배너",
								uk: "Типовий банер бота",
								de: "Standard-Bot-Banner",
								it: "Banner predefinito del bot",
								"pt-BR": "Banner padrão do bot",
								pl: "Domyślny baner bota"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir une bannière",
								ja: "バナーを設定",
								ru: "Задать баннер",
								"es-ES": "Establecer un banner",
								ko: "하나 설정",
								uk: "Задати своє",
								de: "Eines festlegen",
								it: "Imposta uno",
								"pt-BR": "Definir um",
								pl: "Ustaw jeden"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "banner",

					description: "The banner",
					description_localizations: {
						fr: "La bannière du bot",
						ja: "バナー",
						ru: "Баннер",
						"es-ES": "El banner",
						ko: "배너",
						uk: "Банер",
						de: "Das Banner",
						it: "Il banner",
						"pt-BR": "O banner",
						pl: "Baner"
					},

					type: ApplicationCommandOptionType.Attachment,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "bio",
			prefixName: "botbio",

			aliases: ["setbotbio", "setbio"],
			description: "Change the iHorizon bio into your server",
			description_localizations: {
				fr: "Définir la bio de profil du bot sur votre serveur discord",
				ja: "サーバーのiHorizonの自己紹介を変更",
				ru: "Изменить описание iHorizon на сервере",
				"es-ES": "Cambiar la biografía de iHorizon en tu servidor",
				ko: "서버에서 iHorizon의 소개를 변경해요",
				uk: "Змінити біографію iHorizon на вашому сервері",
				de: "Ändere die iHorizon-Bio auf deinem Server",
				it: "Cambia la bio di iHorizon nel tuo server",
				"pt-BR": "Altere a bio do iHorizon no seu servidor",
				pl: "Zmień opis iHorizon na swoim serwerze"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					choices: [
						{
							name: "Default Bot Description",
							name_localizations: {
								fr: "Reprendre la description par défaut du bot",
								ja: "ボットのデフォルトの説明に戻す",
								ru: "Восстановить описание бота по умолчанию",
								"es-ES":
									"Restablecer la descripción predeterminada del bot",
								ko: "기본 봇 소개",
								uk: "Типовий опис бота",
								de: "Standard-Bot-Beschreibung",
								it: "Descrizione predefinita del bot",
								"pt-BR": "Descrição padrão do bot",
								pl: "Domyślny opis bota"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir une description",
								ja: "説明を設定",
								ru: "Задать описание",
								"es-ES": "Establecer una descripción",
								ko: "하나 설정",
								uk: "Задати своє",
								de: "Eines festlegen",
								it: "Imposta uno",
								"pt-BR": "Definir um",
								pl: "Ustaw jeden"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "bio",

					description: "The description",
					description_localizations: {
						fr: "La bio du bot",
						ja: "説明",
						ru: "Описание",
						"es-ES": "La descripción",
						ko: "설명",
						uk: "Опис",
						de: "Die Beschreibung",
						it: "La descrizione",
						"pt-BR": "A descrição",
						pl: "Opis"
					},

					type: ApplicationCommandOptionType.String,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],

	thinking: true,
	category: "profil",
	type: ApplicationCommandType.ChatInput,
	permission: null
};

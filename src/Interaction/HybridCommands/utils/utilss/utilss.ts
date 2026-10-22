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
	name: "utilss",

	description: "SubCommand category for utils command",
	description_localizations: {
		fr: "Commande sous groupé pour la catégorie utilitaire",
		ja: "ユーティリティコマンドのサブコマンドカテゴリ",
		ru: "Категория подкоманд для утилит",
		"es-ES": "Categoría de subcomando para comandos de utilidad"
	},

	options: [
		{
			name: "lockname",

			description:
				"Lock the nickname of a member (it can't be changed until +unlockname)!",
			description_localizations: {
				fr: "Verrouiller le pseudo d'un membre (il ne pourra pas être changé avant +unlockname) !",
				ja: "メンバーのニックネームをロック（+unlocknameで解除するまで変更不可）！",
				ru: "Заблокировать ник участника (нельзя изменить до +unlockname)!",
				"es-ES":
					"Bloquear el apodo de un miembro (no se puede cambiar hasta +unlockname)!"
			},

			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member whose nickname you want to lock",
					description_localizations: {
						fr: "Le membre dont tu veux verrouiller le pseudo",
						ja: "ニックネームをロックしたいメンバー",
						ru: "Участник, чей ник нужно заблокировать",
						"es-ES": "El miembro cuyo apodo quieres bloquear"
					},

					required: true,

					permission: null
				},
				{
					name: "nickname",
					type: ApplicationCommandOptionType.String,

					description:
						"The nickname to set and lock (empty = keep actual)",
					description_localizations: {
						fr: "Le pseudo à définir et verrouiller (vide = garder l'actuel)",
						ja: "設定してロックするニックネーム（空 = 現状維持）",
						ru: "Ник для установки и блокировки (пусто = оставить текущий)",
						"es-ES":
							"El apodo a definir y bloquear (vacío = mantener el actual)"
					},

					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageNicknames
		},
		{
			name: "unlockname",

			description: "Unlock the nickname of a member!",
			description_localizations: {
				fr: "Déverrouiller le pseudo d'un membre !",
				ja: "メンバーのニックネームのロックを解除！",
				ru: "Разблокировать ник участника!",
				"es-ES": "Desbloquear el apodo de un miembro!"
			},

			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member whose nickname you want to unlock",
					description_localizations: {
						fr: "Le membre dont tu veux déverrouiller le pseudo",
						ja: "ニックネームのロックを解除したいメンバー",
						ru: "Участник, чей ник нужно разблокировать",
						"es-ES": "El miembro cuyo apodo quieres desbloquear"
					},

					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageNicknames
		},
		{
			name: "renewvc",

			description:
				"Set the voice region of your current voice channel to automatic",
			description_localizations: {
				fr: "Définir la région vocale de votre salon vocal actuel en automatique",
				ja: "現在のボイスチャンネルのボイスリージョンを自動に設定",
				ru: "Установить голосовой регион текущего голосового канала на автоматический",
				"es-ES":
					"Establecer la región de voz de tu canal de voz actual en automático"
			},

			aliases: ["rvc"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		}
	],

	category: "utils",
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null
};

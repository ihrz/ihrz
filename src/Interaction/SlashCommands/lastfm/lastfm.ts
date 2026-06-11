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
	name: "lastfm",

	description: "Connect your Last.fm account and control music scrobbling.",
	description_localizations: {
		fr: "Connectez votre compte Last.fm et gérez le scrobbling musical."
	},

	options: [
		{
			name: "config",
			prefixName: "config",
			description:
				"Enable or disable Last.fm scrobbling for your account.",
			description_localizations: {
				fr: "Activez ou désactivez le scrobbling Last.fm pour votre compte."
			},
			ephemeral: true,
			options: [
				{
					name: "power",
					description: "Power On or Power Off the module",
					description_localizations: {
						fr: "Activer ou désactiver le module"
					},
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Power On",
							name_localizations: { fr: "Activer" },
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: { fr: "Désactiver" },
							value: "off"
						}
					],
					required: true,
					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "login",
			prefixName: "login",
			description: "Login to Last.fm and store your scrobbling session.",
			description_localizations: {
				fr: "Connectez-vous à Last.fm et enregistrez votre session de scrobbling."
			},
			ephemeral: true,
			options: [
				{
					name: "username",
					description: "Your Last.fm username or email address",
					description_localizations: {
						fr: "Votre nom d’utilisateur ou email Last.fm"
					},
					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "password",
					description: "Your Last.fm password",
					description_localizations: {
						fr: "Votre mot de passe Last.fm"
					},
					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		}
	],
	thinking: true,
	category: "lastfm",
	type: ApplicationCommandType.ChatInput,

	permission: null
};

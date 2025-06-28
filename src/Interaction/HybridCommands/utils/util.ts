/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
} from 'discord.js'

import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: "util",

	description: "SubCommand category for utils command",
	description_localizations: {
		"fr": "Commande sous groupé pour la catégorie utilitaire"
	},

	options: [
		{
			name: "allwebhooks",

			description: "List all registered webhook on the server",
			description_localizations: {
				'fr': "Afficher toute les webhooks enregistrer sur le serveur"
			},

			aliases: ["webhooks", "webhook"],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "nick-kicker",

			description: "Kick a user if their nickname contains a specific word",
			description_localizations: {
				"fr": "Expulse un utilisateur si son surnom contient un mot spécifique"
			},

			aliases: ["nickkick", "nk"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'zip-stickers',

			description: 'Create zip files with all guild stickers in!',
			description_localizations: {
				"fr": "Créer un fichier zip contenant absolument tout les stickers du serveur"
			},

			aliases: ["zipstickers", "zip2"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuildExpressions,

			thinking: true
		},
		{
			name: "vkick",

			description: "Disconnect a member from a voice channel",
			description_localizations: {
				fr: "Déconnecter un membre d'un salon vocal",
			},

			options: [
				{
					name: "member",

					description: "The member you want to disconnect",
					description_localizations: {
						fr: "Le membre que vous voulez déconnecter",
					},

					type: ApplicationCommandOptionType.User,

					permission: null,

					required: true,
				},
			],

			thinking: false,
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers,
		},
		{
			name: 'wakeup',

			description: 'Wake up an user with mass mooving randomly in voice channel',
			description_localizations: {
				"fr": "Réveiller un utilisateur avec un déplacement massif aléatoire dans les salons vocaux"
			},

			aliases: ["wake"],

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: 'member',

					description: 'The member to wake up',
					description_localizations: {
						"fr": "Le membre à réveiller"
					},

					type: ApplicationCommandOptionType.User,

					required: true,

					permission: null
				}
			],

			permission: [PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.MoveMembers]
		},
		{
			name: "autorenew",
			description: "Renew automaticaly X time a channel",

			description_localizations: {
				"fr": "Renouveller automatiquement un salon"
			},

			options: [
				{
					name: "channel",

					description: "The channel to renew every x times",
					description_localizations: {
						"fr": "Le salon qui ce renouveleras x temps"
					},

					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					required: true,
					permission: null
				},
				{
					name: "time",

					description: "The x time",
					description_localizations: {
						"fr": "Le temps x"
					},

					type: ApplicationCommandOptionType.String,

					required: true,
					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: 'admin-roles',

			description: 'Get the list of all guild roles whose have admin permissions',
			description_localizations: {
				"fr": "Obtenez la liste de tous les roles de la guilde disposant d'autorisations d'administrateur"
			},

			aliases: ["allrolesadmin", "adminroles", "adminrole"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'rolelimit',

			description: 'Limit the number of member(s) in the same role',
			description_localizations: {
				"fr": "Limiter le nombre de membres qui peuvent ce partager un rôle."
			},

			aliases: ["limitrole", "limitoles", "roleslimit"],

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "role",

					description: "The role you want to manage",
					description_localizations: {
						"fr": "Le rôle que tu shouaite gérer."
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: true
				},
				{
					name: "members-limit",

					description: "The maximum member you want on the sane role",
					description_localizations: {
						"fr": "Le nombre maximum de membre qui auront le rôle en même temps."
					},

					permission: null,
					type: ApplicationCommandOptionType.Number,

				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'where',
			aliases: ['whereis'],

			description: 'Sending the channel where the members is',
			description_localizations: {
				"fr": "Envoie le salon vocal où est le membre."
			},

			thinking: false,
			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "member",

					description: "The member you want to check",
					description_localizations: {
						"fr": "le membre que vous souhaitez vérifier"
					},

					permission: null,

					type: ApplicationCommandOptionType.User,
					required: true
				}
			],

			permission: PermissionFlagsBits.ModerateMembers,
		},
		{
			name: 'serverpic',

			description: 'Sending the guild image',
			description_localizations: {
				"fr": "Envoie le logo du serveur"
			},

			thinking: false,
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ModerateMembers,
		},
		{
			name: 'unzip-emojis',

			description: 'Recreate all emojis from a zip file',
			description_localizations: {
				"fr": "Recreer tout les emojis depuis un fichier zip"
			},

			aliases: ["unzipemojis", "unzip1"],

			options: [
				{
					name: "zip_file",

					description: "The zip file to recreate emojis",
					description_localizations: {
						"fr": "Le fichier zip pour recréer les emojis"
					},

					type: ApplicationCommandOptionType.Attachment,

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			thinking: true,

			permission: PermissionFlagsBits.ManageGuildExpressions
		},
		{
			name: "sync",

			description: "Sync all channels to the parent category",

			description_localizations: {
				"fr": "Synchroniser tous les channels avec la catégorie parent"
			},

			options: [
				{
					name: "category",

					description: "The category to sync channels to",
					description_localizations: {
						"fr": "La catégorie pour synchroniser les channels"
					},

					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildCategory],

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "addrolereact",

			description: "Add a role to all users who reacted to a specific message",
			description_localizations: {
				"fr": "Ajouter un rôle à tous les utilisateurs qui ont réagi à un message spécifique"
			},

			options: [
				{
					name: "message_id",

					description: "The ID of the message to check reactions from",
					description_localizations: {
						"fr": "L'ID du message dont on veut vérifier les réactions"
					},

					type: ApplicationCommandOptionType.String,

					required: true,
					permission: null
				},
				{
					name: "role",

					description: "The role to add to users",
					description_localizations: {
						"fr": "Le rôle à ajouter aux utilisateurs"
					},

					type: ApplicationCommandOptionType.Role,

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageRoles,
		},
		{
			name: 'inviteinfo',

			description: 'Get informations about the discord invite link',
			description_localizations: {
				"fr": "Obtenir des informations vis-à-vis de l'invitations discord"
			},

			aliases: [],

			options: [
				{
					name: "discord_invite",

					description: "the discord invite / code",
					description_localizations: {
						"fr": "le lien d'invitation discord ou le code"
					},

					type: ApplicationCommandOptionType.String,

					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			thinking: true,

			permission: PermissionFlagsBits.ManageGuild
		},
	],

	category: 'utils',
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null
};
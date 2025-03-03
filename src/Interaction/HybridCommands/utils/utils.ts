/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionFlagsBits,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: "utils",

	description: "SubCommand category for utils command",
	description_localizations: {
		"fr": "Commande sous groupé pour la catégorie utilitaire"
	},

	options: [
		{
			name: "avatar",

			description: "Pick the avatar of a user!",
			description_localizations: {
				"fr": "Récuperer l'avatar d'un utilisateur"
			},

			aliases: ["pfp", "pp", "pic"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,

					description: 'The user',
					description_localizations: {
						"fr": "L'utilisateur"
					},

					required: false,
					permission: null
				}
			],

			permission: null
		},
		{
			name: 'vc',

			description: 'Get the voice states of the guild!',
			description_localizations: {
				"fr": "Obtenez les états des vocaux du serveur"
			},

			options: [
				{
					name: "show-mode",

					description: "Show mode (large, brief)",
					description_localizations: {
						"fr": "Mode d'affichage (complet, court)"
					},

					choices: [
						{
							name: "Large",
							value: "large"
						},
						{
							name: "Short",
							value: "short"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: 'vanity-generator',

			aliases: ["vanity", "vanity-gen", "customvanity"],

			description: 'Get your own vanity URL in discord.wf format!',
			description_localizations: {
				"fr": "Créer votre propre URL vanity sous le format discord.wf"
			},

			options: [
				{
					name: "code",

					description: "Vanity URL code",
					description_localizations: {
						"fr": "Le code du Vanity"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: 'userinfo',

			description: 'Get information about a user!',
			description_localizations: {
				"fr": "Obtenir des informations sur un utilisateur"
			},

			aliases: ["ui"],

			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,

					description: 'user you want to lookup',
					description_localizations: {
						"fr": "utilisateur que vous souhaitez rechercher"
					},

					required: false,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: 'snipe',

			description: 'Get the last message deleted in this channel!',
			description_localizations: {
				"fr": "Obtenez le dernier message supprimé sur ce cannal"
			},

			aliases: ["s", "snp"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: 'leash',

			description: 'Leash a member in the guild',
			description_localizations: {
				"fr": "Mettre en laisse un utilisateur sur le serveur"
			},

			options: [
				{
					name: 'member',
					type: ApplicationCommandOptionType.User,

					description: 'member you want to leash',
					description_localizations: {
						"fr": "utilisateur que vous souhaitez mettre en laisse"
					},

					required: true,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'unleash',

			description: 'UnLeash a member in the guild',
			description_localizations: {
				"fr": "Enlever la laisse à un utilisateur sur le serveur"
			},

			options: [
				{
					name: 'member',
					type: ApplicationCommandOptionType.User,

					description: 'member you want to unleash',
					description_localizations: {
						"fr": "utilisateur que vous souhaitez supprimer sa laisse"
					},

					required: true,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'dm',
			name_localizations: {
				"fr": "mp"
			},

			description: 'Send a private message to the user1',
			description_localizations: {
				"fr": "Envoyer un message privée à un utilisateur"
			},

			options: [
				{
					name: "private",

					description: "is private ?",
					description_localizations: {
						"fr": "l'autheur est-t'il anonyme ?"
					},

					choices: [
						{ name: "Yes", value: "yes" },
						{ name: "No", value: "no" }
					],
					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "member",

					description: "the member you want",
					description_localizations: {
						"fr": "l'autheur que vous voulez"
					},

					type: ApplicationCommandOptionType.User,
					required: true,

					permission: null
				},
				{
					name: "message",

					description: "the private message",
					description_localizations: {
						"fr": "le message"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
			],

			permission: PermissionFlagsBits.Administrator,

			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: 'wlroles',

			description: 'Define allowed roles for addrole & delrole command',
			description_localizations: {
				"fr": "Définir les rôles autorisés pour les commandes addrole et delrole"
			},

			aliases: ["wlrole"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'pic-only',

			description: 'Define channels for only picture sending (block other content)',
			description_localizations: {
				"fr": "Définir des canaux pour l'envoi d'images uniquement (bloquer d'autres contenus)"
			},

			aliases: ["piconly"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'setmentionrole',

			description: 'Give a specific role to the user who pings me!',
			description_localizations: {
				"fr": "Donner un rôle spécifique à l'utilisateur qui me ping"
			},

			aliases: ["setrank", "setranks", "rankset"],

			options: [
				{
					name: 'action',
					type: ApplicationCommandOptionType.String,

					description: 'What you want to do?',
					description_localizations: {
						"fr": "Que veux-tu faire?"
					},

					required: true,
					choices: [
						{
							name: "Power Off",
							value: "off"
						},
						{
							name: 'Power On',
							value: "on"
						}
					],
					permission: null
				},
				{
					name: 'roles',
					type: ApplicationCommandOptionType.Role,

					description: 'The specific roles to give !',
					description_localizations: {
						"fr": "Les rôles spécifiques à donner"
					},

					required: false,
					permission: null
				},
				{
					name: 'part-of-nickname',
					type: ApplicationCommandOptionType.String,

					description: 'La partie du surnom que vous souhaitez que la personne ait dans son surnom',
					description_localizations: {
						"fr": "The part of the nickname you want the person to have in their nickname"
					},

					required: false,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'renew',

			description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent',
			description_localizations: {
				"fr": "Recréation d'un canal (autorisation de clonage et toutes les configurations)"
			},

			aliases: ["r", "rnw"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: 'prevnames',

			description: 'Lookup an Discord User, and see this previous username !',
			description_localizations: {
				"fr": "Recherchez un utilisateur Discord et voyez ces noms d'utilisateur précédent"
			},

			aliases: ["pvnames", "pvname", "prevname"],

			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,

					description: "L'utilisateur que vous voulez rechercher",
					description_localizations: {
						"fr": "user you want to see this previous username"
					},

					required: false,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: 'nickrole',

			description: 'Give a roles to all user who have specified char in their username!',
			description_localizations: {
				"fr": "Donnez un rôle à tous les utilisateurs qui ont un caractère spécifique dans leur nom d'utilisateur"
			},

			options: [
				{
					name: 'action',
					type: ApplicationCommandOptionType.String,

					description: 'The action you want to do',
					description_localizations: {
						"fr": "L'action que vous souhaitez faire"
					},

					required: true,
					choices: [
						{
							name: 'Add',
							value: 'add'
						},
						{
							name: 'Remove',
							value: 'sub'
						}
					],

					permission: null
				},
				{
					name: 'nickname',
					type: ApplicationCommandOptionType.String,

					description: 'The part including in the nickname',
					description_localizations: {
						"fr": "La partie incluant dans le pseudo"
					},

					required: true,

					permission: null
				},
				{
					name: 'role',
					type: ApplicationCommandOptionType.Role,

					description: 'The role you want to give',
					description_localizations: {
						"fr": "Le rôle que vous souhaitez donner"
					},

					required: true,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'massmove',

			description: 'Move all members connected in a voice channel to another one',
			description_localizations: {
				"fr": "Déplacer tous les membres connectés dans un canal vocal vers un autre"
			},

			options: [
				{
					name: 'channel',
					type: ApplicationCommandOptionType.Channel,

					channel_types: [ChannelType.GuildVoice],

					description: 'The voice channel to move members to',
					description_localizations: {
						"fr": "Le canal vocal où déplacer les membres"
					},

					required: true,

					permission: null
				},
				{
					name: 'from',
					type: ApplicationCommandOptionType.Channel,

					channel_types: [ChannelType.GuildVoice],

					description: 'The voice channel to move members from',
					description_localizations: {
						"fr": "Le canal vocal d'où déplacer les membres"
					},

					required: false,

					permission: null
				},
			],

			thinking: true,
			type: ApplicationCommandOptionType.Subcommand,
			permission: [PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ModerateMembers]
		},
		{
			name: 'massiverole',

			description: 'Add/Remove roles to everyone on the server',
			description_localizations: {
				"fr": "Ajouter/Supprimer des rôles pour tout le monde sur le serveur"
			},

			aliases: ["massrole", "massroles"],

			options: [
				{
					name: 'action',
					type: ApplicationCommandOptionType.String,

					description: 'What you want to do?',
					description_localizations: {
						"fr": "Que veux-tu faire?"
					},

					required: true,
					choices: [
						{
							name: "Add",
							value: "add"
						},
						{
							name: 'Remove',
							value: "sub"
						}
					],

					permission: null
				},
				{
					name: 'role',
					type: ApplicationCommandOptionType.Role,

					description: 'The specified role you want to add',
					description_localizations: {
						"fr": "Le rôle spécifié que vous souhaitez ajouter"
					},

					required: true,

					permission: null
				}
			],

			thinking: true,
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'serverinfo',

			description: 'Get information about the server!',
			description_localizations: {
				"fr": "Obtenir des informations sur le serveur"
			},

			aliases: ["si", "gi"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: 'emojis',

			description: 'Add emojis to your server easly',
			description_localizations: {
				"fr": "Ajoutez facilement des emojis à votre serveur"
			},

			options: [
				{
					name: 'emojis',
					type: ApplicationCommandOptionType.String,

					description: 'What the emoji then?',
					description_localizations: {
						"fr": "C'est quoi cette emoji alors ?"
					},

					required: true,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuildExpressions
		},
		{
			name: 'embed',
			description: 'Create a beautiful embed!',
			description_localizations: {
				"fr": "Créez un magnifique embed",
			},
			options: [
				{
					name: 'id',
					type: ApplicationCommandOptionType.String,
					description: 'If you have an embed\'s ID!',
					description_localizations: {
						"fr": "Si vous disposez d\'un identifiant d\'un embed précèdement enregistrer",
					},
					required: false,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: 'derank',

			description: 'Remove all roles of an members',
			description_localizations: {
				"fr": "Supprimer tous les rôles d'un membre"
			},

			options: [
				{
					name: 'member',
					type: ApplicationCommandOptionType.User,

					description: 'The user',
					description_localizations: {
						"fr": "l'utilisateur"
					},

					required: true,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'admin-users',

			description: 'Get the list of all guild member whose have admin permissions',
			description_localizations: {
				"fr": "Obtenez la liste de tous les membres de la guilde disposant d'autorisations d'administrateur"
			},

			aliases: ["alladmin", "allperms"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'allbots',

			description: 'Get the list of all bot in the guild',
			description_localizations: {
				"fr": "Obtenez la liste de tous les bot de la guilde"
			},

			aliases: ["allb", "bots"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "addrole",
			prefixName: "addrole",

			description: "Add role to user",
			description_localizations: {
				"fr": "Ajouter un rôle à un utilisateur"
			},

			options: [
				{
					name: "user",

					description: "The user you want to add role",
					description_localizations: {
						"fr": "L'utilisateur que vous voulez ajouter le rôle"
					},

					type: ApplicationCommandOptionType.User,

					required: true,

					permission: null
				},
				{
					name: "role",

					description: "The role you want to add to the user",
					description_localizations: {
						"fr": "Le role que vous voulez ajouter a l'utilisateur"
					},

					type: ApplicationCommandOptionType.Role,

					required: true,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageRoles
		},
		{
			name: "delrole",

			description: "Removew role to user",
			description_localizations: {
				"fr": "Enlever un rôle à un utilisateur"
			},

			options: [
				{
					name: "user",

					description: "The user you want to remove role",
					description_localizations: {
						"fr": "L'utilisateur que vous voulez enlever le rôle"
					},

					type: ApplicationCommandOptionType.User,

					required: true,

					permission: null
				},
				{
					name: "role",

					description: "The role you want to remove to the user",
					description_localizations: {
						"fr": "Le role que vous voulez enlever a l'utilisateur"
					},

					type: ApplicationCommandOptionType.Role,

					required: true,

					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageRoles
		},
		{
			name: 'zip-emojis',

			description: 'Create zip files with all guild emojis in!',
			description_localizations: {
				"fr": "Créer un fichier zip contenant absolument tout les émojis du serveur"
			},

			aliases: ["zipemojis", "zip1"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageGuildExpressions
		},
	],

	category: 'utils',
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null
};
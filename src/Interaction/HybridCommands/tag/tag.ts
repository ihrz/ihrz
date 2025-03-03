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
	ApplicationCommandType,
	ApplicationCommandOptionType,
	PermissionFlagsBits,
	EmbedBuilder,
	Message,
	time,
	ChatInputCommandInteraction
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

export function generateTagInfoEmbed(interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, tag_id: string, tag: DatabaseStructure.TagInfo) {
	return new EmbedBuilder()
		.setTitle(`${lang.tag_name} #${tag_id}`)
		.setThumbnail(interaction?.guild!.iconURL() || interaction.member!.user.avatarURL() || interaction.client.user.displayAvatarURL())
		.setColor("Aqua")
		.setDescription(
			`${interaction.client.iHorizon_Emojis.icon.Crown_Logo} > **${lang.var_author}:** <@${tag.createBy}>\n` +
			`${interaction.client.iHorizon_Emojis.icon.Sparkles} > **${lang.tag_embed_created_at}:** ${time(new Date(tag.createTimestamp), "D")}\n` +
			`${interaction.client.iHorizon_Emojis.icon.Timer} > **${lang.tag_embed_last_update}:** ${time(new Date(tag.lastUseTimestamp), "D")}\n` +
			`${interaction.client.iHorizon_Emojis.icon.Timer} > **${lang.var_uses}:** ${"**`" + tag.uses + "`**"}\n` +
			`${interaction.client.iHorizon_Emojis.icon.Boosting_24_Months_Logo} > **${lang.tag_embed_last_updated_by}:** ${tag.lastUseBy ? '<@' + tag.lastUseBy + '>' : lang.var_no_set}`
		);
}

export const command: Command = {
	name: "tag",
	description: "Subcommand for the category of tags message",
	description_localizations: {
		"fr": "Sous-commande pour la catégorie de message de tags"
	},

	options: [
		{
			name: "wlroles-use",
			prefixName: "tag-wluse",

			description: "Roles whitelist for using tags",
			description_localizations: {
				fr: "Rôles whitelist pour utiliser les tags"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "wlroles-create",
			prefixName: "tag-wlcreate",

			description: "Roles whitelist for creating tags",
			description_localizations: {
				fr: "Rôles whitelist pour créer des tags"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "use",
			prefixName: "tag-use",

			description: "Use a tag",
			description_localizations: {
				fr: "Utiliser un tag"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "mention",

					description: "Mention the user",
					description_localizations: {
						fr: "Mentionner l'utilisateur"
					},

					type: ApplicationCommandOptionType.User,
					required: false,
					permission: null
				},
				{
					name: "message_id",

					description: "Message's ID to reply",
					description_localizations: {
						fr: "ID du message pour répondre"
					},

					type: ApplicationCommandOptionType.String,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			ephemeral: true,
			permission: null
		},
		{
			name: "create",
			prefixName: "tag-create",

			description: "Create a tag",
			description_localizations: {
				fr: "Créer un tag"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "embed_id",

					description: "Embed's ID",
					description_localizations: {
						fr: "ID de l'embed"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "edit",

			description: "Edit a tag",
			description_localizations: {
				"fr": "Modifier un tag"
			},

			options: [
				{
					name: "current_tag_name",

					description: "The current tag name",
					description_localizations: {
						"fr": "Le nom actuel du tag"
					},

					type: ApplicationCommandOptionType.String,
					permission: null,
					required: true
				},
				{
					name: "new_tag_name",

					description: "The new tag name",
					description_localizations: {
						"fr": "Le nouveau nom du tag"
					},

					type: ApplicationCommandOptionType.String,
					permission: null,
					required: true
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null,
		},
		{
			name: "delete",
			prefixName: "tag-delete",

			description: "Delete a tag",
			description_localizations: {
				fr: "Supprimer un tag"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "list",
			prefixName: "tag-list",

			description: "List all tags",
			description_localizations: {
				fr: "Lister tous les tags"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "info",
			prefixName: "tag-info",

			description: "Info of a tag",
			description_localizations: {
				fr: "Info d'un tag"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null,
			ephemeral: true
		}
	],

	category: 'tags',
	thinking: false,
	permission: null,
	type: ApplicationCommandType.ChatInput,
};
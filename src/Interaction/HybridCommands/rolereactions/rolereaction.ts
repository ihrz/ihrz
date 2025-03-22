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
	Client,
	EmbedBuilder,
	PermissionsBitField,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	BaseGuildTextChannel,
	ApplicationCommandType,
	Message,
	ChannelType,
	Channel,
	PermissionFlagsBits
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: 'rolereaction',

	description: 'Set a roles when user react to a message with specific emoji',
	description_localizations: {
		"fr": "Définir des rôles lorsque l'utilisateur réagit à un message avec des emoji spécifiques"
	},

	aliases: ["rolereact"],
	options: [
		{
			name: "value",

			description: "Please make your choice.",
			description_localizations: {
				"fr": "Merci de faire votre choix"
			},

			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{
					name: "Add another",
					value: "add"
				},
				{
					name: "Remove one",
					value: "remove"
				}
			],

			permission: null
		},
		{
			name: 'channel',
			type: ApplicationCommandOptionType.Channel,

			description: "The channel where is the message",
			description_localizations: {
				"fr": "Le salon textuelle où se trouve le message"
			},

			channel_types: [ChannelType.GuildText],

			required: true,

			permission: null
		},
		{
			name: 'messageid',
			type: ApplicationCommandOptionType.String,

			description: "Please copy the identifiant of the message you want to configure",
			description_localizations: {
				"fr": "Veuillez copier l'identifiant du message que vous souhaitez configurer"
			},

			required: true,

			permission: null
		},
		{
			name: 'reaction',
			type: ApplicationCommandOptionType.String,

			description: `The emojis you want`,
			description_localizations: {
				"fr": "Les emojis que tu veux"
			},

			required: false,

			permission: null
		},
		{
			name: 'role',
			type: ApplicationCommandOptionType.Role,

			description: 'The role you want to configure',
			description_localizations: {
				"fr": "Le rôle que vous souhaitez configurer"
			},

			required: false,

			permission: null
		}
	],
	category: 'rolereactions',
	permission: PermissionFlagsBits.Administrator,
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const regex = /<a?:\w+:(\d+)>/;

		if (interaction instanceof ChatInputCommandInteraction) {
			var type = interaction.options.getString("value");
			var channel = interaction.options.getChannel("channel")! as Channel | null;
			var messagei = interaction.options.getString("messageid");
			var reaction = interaction.options.getString("reaction");
			var role = interaction.options.getRole("role");
		} else {

			var type = client.func.method.string(args!, 0);
			var channel = await client.func.method.channel(interaction, args!, 1);
			var messagei = client.func.method.string(args!, 2);
			var reaction = client.func.method.string(args!, 3);
			var role = client.func.method.role(interaction, args!, 4);
		}

		let match = reaction?.match(regex);
		reaction = match ? match[1] : reaction;

		let help_embed = new EmbedBuilder()
			.setColor("#0000FF")
			.setTitle("/reactionroles Help !")
			.setDescription(lang.reactionroles_embed_message_description_added);

		if (type == "add") {
			if (!role) { await client.func.method.interactionSend(interaction, { embeds: [help_embed] }) };
			if (!reaction) { return await client.func.method.interactionSend(interaction, { content: lang.reactionroles_missing_reaction_added }) };

			let msg = await (channel as BaseGuildTextChannel)?.messages.fetch(messagei!);

			msg.react(reaction)
				.then(async () => {
					if (!reaction) return;

					if (reaction.includes("<") || reaction.includes(">") || reaction.includes(":")) {
						await client.func.method.interactionSend(interaction, {
							content: lang.reactionroles_invalid_emote_format_added.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
						})
						return;
					};

					await client.db.set(`${interaction.guildId}.GUILD.REACTION_ROLES.${messagei}.${reaction}`,
						{
							rolesID: role?.id, reactionNAME: reaction, enable: true
						}
					);

					await client.func.ihorizon_logs(interaction, {
						title: lang.reactionroles_logs_embed_title_added,
						description: lang.reactionroles_logs_embed_description_added
							.replace("${interaction.user.id}", interaction.member?.user.id!)
							.replace("${messagei}", messagei!)
							.replace("${reaction}", reaction)
							.replace("${role}", role?.toString()!)
					});

					await client.func.method.interactionSend(interaction, {
						content: lang.reactionroles_command_work_added
							.replace("${messagei}", messagei!)
							.replace("${reaction}", reaction)
							.replace("${role}", role?.toString()!)
						, flags: [1 << 6]
					});
				})
				.catch(async () => {
					await client.func.method.interactionSend(interaction, { content: lang.reactionroles_dont_message_found });
					return;
				})
			return;
		} else if (type == "remove") {

			if (!reaction) {
				await client.func.method.interactionSend(interaction, { content: lang.reactionroles_missing_remove });
				return;
			};

			let message = await (channel as BaseGuildTextChannel)?.messages.fetch(messagei as string).catch(async () => {
				await client.func.method.interactionSend(interaction, { content: lang.reactionroles_cant_fetched_reaction_remove })
				return;
			});

			let fetched = await client.db.get(`${interaction.guildId}.GUILD.REACTION_ROLES.${messagei}.${reaction}`);

			if (!fetched) {
				await client.func.method.interactionSend(interaction, { content: lang.reactionroles_missing_reaction_remove });
				return
			};

			let reactionVar = message?.reactions.cache.get(fetched.reactionNAME);

			if (!reactionVar) {
				await client.func.method.interactionSend(interaction, { content: lang.reactionroles_cant_fetched_reaction_remove })
				return;
			};
			await reactionVar.users.remove(client.user.id).catch((err: string) => { logger.err(err) });

			await client.db.delete(`${interaction.guildId}.GUILD.REACTION_ROLES.${messagei}.${reaction}`);

			await client.func.ihorizon_logs(interaction, {
				title: lang.reactionroles_logs_embed_title_remove,
				description: lang.reactionroles_logs_embed_description_remove
					.replace("${interaction.user.id}", interaction.member.user.id)
					.replace("${messagei}", messagei!)
					.replace("${reaction}", reaction!)
			});

			await client.func.method.interactionSend(interaction, {
				content: lang.reactionroles_command_work_remove
					.replace("${reaction}", reaction!)
					.replace("${messagei}", messagei!)
				, flags: [1 << 6]
			});
			return;
		};
	},
};
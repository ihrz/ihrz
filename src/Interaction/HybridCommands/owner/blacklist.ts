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
	Client,
	EmbedBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ChatInputCommandInteraction,
	GuildMember,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { format } from '../../../core/functions/date_and_time.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

export const command: Command = {
	name: 'blacklist',

	description: 'Add a user to the blacklist!',
	description_localizations: {
		"fr": "Ajoutez un utilisateur à la liste noir"
	},

	options: [
		{
			name: 'user',
			type: ApplicationCommandOptionType.User,

			description: 'The user you want to blacklist...',
			description_localizations: {
				"fr": "L'utilisateur que vous voulez blacklist"
			},

			required: false,

			permission: null
		},
		{
			name: 'reason',
			type: ApplicationCommandOptionType.String,

			description: 'The reason why you want to blacklist this member',
			description_localizations: {
				"fr": "La raison de pourquoi vous voulez le mettre dans la liste-noire"
			},

			required: false,

			permission: null
		}
	],

	aliases: ["bl"],

	thinking: false,
	category: 'owner',
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const tableOwner = client.db.table('OWNER');
		const tableBlacklist = client.db.table('BLACKLIST');

		if (!await tableOwner.get(`${interaction.member.user.id}.owner`)) {
			await client.func.method.interactionSend(interaction, { content: lang.blacklist_not_owner });
			return;
		};

		const blacklistedUsers = await tableBlacklist.all();

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getMember('user') as GuildMember | null;
			var user = interaction.options.getUser('user');
			var reason = "iHorizon Project Blacklist - " + (interaction.options.getString('reason') || 'blacklisted!');
		} else {
			var member = client.func.method.member(interaction, args!, 0) as GuildMember | null;
			var user = await client.func.method.user(interaction, args!, 0);
			var reason = "iHorizon Project Blacklist - " + (client.func.method.longString(args!, 1) || 'blacklisted!');
		};

		if (client.config.owner.ownerid1 === member?.id || client.config.owner.ownerid2 === member?.id) {
			await client.func.method.interactionSend(interaction, { content: lang.unowner_cant_unowner_creator });
			return;
		};

		if (!member && !user) {
			if (!blacklistedUsers.length) {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_no_one_blacklist
						.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No),
					flags: [1 << 6]
				});
				return;
			};

			let currentPage = 0;
			const usersPerPage = 5;
			const pages: { title: string; description: string; }[] = [];

			for (let i = 0; i < blacklistedUsers.length; i += usersPerPage) {
				const pageUsers = blacklistedUsers.slice(i, i + usersPerPage);
				const pageContent = pageUsers.map(userObj => {
					return `<@${userObj.id}>\n├─ ${userObj.value.createdAt !== undefined ? format(new Date(userObj.value.createdAt), 'MMM DD YYYY') : lang.profil_unknown}\n├─ \`${userObj.value.reason || lang.blacklist_var_no_reason}\`\n├─ By ${userObj.value.owner || lang.profil_unknown}`;
				}).join('\n');

				pages.push({
					title: lang.blacklist_embed_title
						.replace('${i / usersPerPage + 1}', (i / usersPerPage + 1).toString()),
					description: pageContent,
				});
			}

			const createEmbed = () => {
				return new EmbedBuilder()
					.setColor("#2E2EFE")
					.setTitle(pages[currentPage]?.title)
					.setDescription(pages[currentPage]?.description)
					.setFooter({
						text: lang.history_embed_footer_text
							.replace('${currentPage + 1}', (currentPage + 1).toString())
							.replace('${pages.length}', pages.length.toString()),
						iconURL: "attachment://footer_icon.png"
					})
					.setTimestamp();
			};

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('previousPage')
					.setLabel('⬅️')
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId('nextPage')
					.setLabel('➡️')
					.setStyle(ButtonStyle.Secondary)
			);

			const messageEmbed = await client.func.method.interactionSend(interaction, {
				embeds: [createEmbed()],
				components: [row],
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});

			const collector = messageEmbed.createMessageComponentCollector({
				filter: async (i) => {
					await i.deferUpdate(); return interaction.member?.user.id === i.user.id;
				},
				time: 60000
			});

			collector.on('collect', (interaction: { customId: string; }) => {
				if (interaction.customId === 'previousPage') {
					currentPage = (currentPage - 1 + pages.length) % pages.length;
				} else if (interaction.customId === 'nextPage') {
					currentPage = (currentPage + 1) % pages.length;
				}

				messageEmbed.edit({ embeds: [createEmbed()] });
			});

			collector.on('end', () => {
				row.components.forEach((component) => {
					if (component instanceof ButtonBuilder) {
						component.setDisabled(true);
					}
				});
				messageEmbed.edit({ components: [row] });
			});
		};

		const guilds = client.guilds.cache.map(guild => guild.id);

		if (member) {
			if (member.user.id === client.user.id) {
				await client.func.method.interactionSend(interaction, { content: lang.blacklist_bot_lol });
				return;
			};

			const fetched = await tableBlacklist.get(`${member.user.id}`);

			if (fetched) {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_already_blacklisted
						.replace(/\${member\.user\.username}/g, member.user.globalName || member.user.username)
				});
				return;
			};

			await tableBlacklist.set(`${member.user.id}`, {
				blacklisted: true,
				reason,
				owner: interaction.member.user.id,
				createdAt: new Date().getTime()
			});

			await member.ban({ reason }).then(async () => {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_command_work
						.replace(/\${member\.user\.username}/g, String(member?.user.globalName || member?.user.username))
				});
			}).catch(async () => {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_blacklisted_but_can_ban_him
						.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
				});
			});

			// Batch processing to avoid blocking the main process
			const batchSize = 10; // Process 10 servers at a time
			const delay = 100; // 100ms delay between batches

			// Immediate response to user
			await client.func.method.channelSend(interaction, {
				content: lang.batch_ban_process
					.replace("${member.user.username}", member.user.username)
					.replace("${guilds.length}", guilds.length.toString())
			});

			// Asynchronous background processing
			setImmediate(async () => {
				let successCount = 0;

				for (let i = 0; i < guilds.length; i += batchSize) {
					const batch = guilds.slice(i, i + batchSize);

					const batchPromises = batch.map(async (guildId) => {
						const guild = client.guilds.cache.find(g => g.id === guildId);
						if (guild && guild.memberCount < 500) {
							try {
								await guild.members.ban(member?.user.id!, { reason });
								return true;
							} catch {
								return false;
							}
						}
						return false;
					});

					const batchResults = await Promise.all(batchPromises);
					successCount += batchResults.filter(r => r).length;

					// Small delay to avoid overwhelming Discord API
					if (i + batchSize < guilds.length) {
						await new Promise(resolve => setTimeout(resolve, delay));
					}
				}

				// Final notification
				await client.func.method.channelSend(interaction, {
					content: `✅ ${member?.user.username} banned on **${successCount}** server(s) (\`${successCount}/${guilds.length}\`)`
				});
			});
		} else if (user) {

			if (user.id === client.user.id) {
				await client.func.method.interactionSend(interaction, { content: lang.blacklist_bot_lol });
				return;
			};

			const fetched = await tableBlacklist.get(`${user.id}`);

			if (fetched) {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_already_blacklisted
						.replace(/\${member\.user\.username}/g, user.globalName || user.username)
				});
				return;
			}

			await tableBlacklist.set(`${user.id}`, {
				blacklisted: true,
				reason,
				owner: interaction.member.user.id,
				createdAt: new Date().getTime()
			});

			await client.func.method.interactionSend(interaction, {
				content: lang.blacklist_command_work
					.replace(/\${member\.user\.username}/g, user.globalName || user.username)
			});

			// Batch processing to avoid blocking the main process
			const batchSize = 10; // Process 10 servers at a time
			const delay = 100; // 100ms delay between batches

			// Immediate response to user
			await client.func.method.channelSend(interaction, {
				content: lang.batch_ban_process
					.replace("${member.user.username}", user.globalName || user.username)
					.replace("${guilds.length}", guilds.length.toString())
			});

			// Traitement asynchrone en arrière-plan
			setImmediate(async () => {
				let successCount = 0;

				for (let i = 0; i < guilds.length; i += batchSize) {
					const batch = guilds.slice(i, i + batchSize);

					const batchPromises = batch.map(async (guildId) => {
						const guild = client.guilds.cache.find(g => g.id === guildId);
						if (guild && guild.memberCount < 500) {
							try {
								await guild.members.ban(user?.id!, { reason });
								return true;
							} catch {
								return false;
							}
						}
						return false;
					});

					const batchResults = await Promise.all(batchPromises);
					successCount += batchResults.filter(r => r).length;

					// Petit délai pour ne pas surcharger l'API Discord
					if (i + batchSize < guilds.length) {
						await new Promise(resolve => setTimeout(resolve, delay));
					}
				}

				// Final notification
				await client.func.method.channelSend(interaction, {
					content: `✅ ${user?.globalName || user?.username} banned on **${successCount}** server(s) (\`${successCount}/${guilds.length}\`)`
				});
			});
		}
	},
	permission: null
};
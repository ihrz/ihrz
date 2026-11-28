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

import type { LogType } from "../../../core/functions/logChannel.js";
import {
	Client,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	BaseGuildTextChannel,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
	Message,
	Channel,
	CategoryChannel,
	GuildBasedChannel,
	OverwriteResolvable,
	OverwriteType,
	PermissionsBitField,
	User
} from "discord.js";

import { Command } from "../../../../types/command.js";
import logger from "../../../core/logger.js";
import { LanguageData } from "../../../../types/languageData.js";
import { cardPayload, notice, sendCard } from "../../../core/modules/uiCard.js";

// The log events post embeds: the bot needs these in every log channel.
const LOG_CHANNEL_PERMISSIONS = [
	PermissionFlagsBits.ViewChannel,
	PermissionFlagsBits.SendMessages,
	PermissionFlagsBits.EmbedLinks
];

// The LOGS category denies these to @everyone and grants the log permissions
// to the bot: Discord only lets a bot set the permissions it holds itself.
const AUTO_SETUP_PERMISSIONS = [
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.ReadMessageHistory,
	...LOG_CHANNEL_PERMISSIONS
];

export function missingLogPermissions(
	target: GuildBasedChannel | undefined,
	botUser: User
): string[] {
	// A forum: the bot opens a post per log type and writes in it.
	const needed =
		target?.type === ChannelType.GuildForum
			? [
					...LOG_CHANNEL_PERMISSIONS,
					PermissionFlagsBits.SendMessagesInThreads
				]
			: LOG_CHANNEL_PERMISSIONS;
	const permissions = target?.permissionsFor(botUser);
	return permissions
		? permissions.missing(needed)
		: new PermissionsBitField(needed).toArray();
}

function formatPermissions(names: string[]): string {
	return names.map((name) => `\`${name}\``).join(", ");
}

// Without its own overwrite the bot is locked out of a category that hides
// itself from @everyone, unless it is an administrator.
function botLogOverwrite(botUser: User): OverwriteResolvable {
	return {
		id: botUser.id,
		type: OverwriteType.Member,
		allow: LOG_CHANNEL_PERMISSIONS
	};
}

export const command: Command = {
	name: "setlogs",

	description: "Set a logs channel for Audits Logs!",
	description_localizations: {
		fr: "Définir des canaux de journaux pour les journaux d'audit",
		ja: "監査ログ用のログチャンネルを設定！",
		ru: "Установить канал для аудита!",
		"es-ES":
			"Establecer un canal de registros para los registros de auditoría!",
		ko: "감사 로그 채널을 설정해요!",
		uk: "Встановити канал для журналів аудиту!",
		de: "Legt einen Kanal für Audit-Logs fest!",
		it: "Imposta un canale per i log di controllo!",
		"pt-BR": "Define um canal para os logs de auditoria!",
		pl: "Ustawia kanał dla logów audytu!"
	},

	aliases: ["logs", "setlog"],

	options: [
		{
			name: "type",
			type: ApplicationCommandOptionType.String,
			description: "Specified logs category",
			description_localizations: {
				fr: "Spécifier le canal de journaux",
				ja: "指定されたログカテゴリ",
				ru: "Указанная категория логов",
				"es-ES": "Categoría de registros especificada",
				ko: "지정할 로그 종류",
				uk: "Вказана категорія журналів",
				de: "Bestimmte Log-Kategorie",
				it: "Categoria di log specifica",
				"pt-BR": "Categoria de logs específica",
				pl: "Wybrana kategoria logów"
			},
			required: true,
			choices: [
				{
					name: "Setup all channels",
					name_localizations: {
						fr: "Configurer tous les canaux",
						ja: "setup_all_channels",
						ru: "setup_all_channels",
						"es-ES": "setup_all_channels",
						ko: "모든 채널 설정",
						uk: "Налаштувати всі канали",
						de: "Alle Kanäle einrichten",
						it: "Configura tutti i canali",
						"pt-BR": "Configurar todos os canais",
						pl: "Skonfiguruj wszystkie kanały"
					},
					value: "auto"
				},
				{
					name: "Delete all settings",
					name_localizations: {
						fr: "Supprimer toutes les configurations",
						ja: "delete_all_settings",
						ru: "delete_all_settings",
						"es-ES": "delete_all_settings",
						ko: "모든 설정 삭제",
						uk: "Видалити всі налаштування",
						de: "Alle Einstellungen löschen",
						it: "Elimina tutte le impostazioni",
						"pt-BR": "Excluir todas as configurações",
						pl: "Usuń wszystkie ustawienia"
					},
					value: "off"
				},
				{
					name: "AntiSpam Logs",
					name_localizations: {
						fr: "Logs AntiSpam",
						ja: "antispam_logs",
						ru: "antispam_logs",
						"es-ES": "antispam_logs",
						ko: "스팸 방지 로그",
						uk: "Журнали антиспаму",
						de: "AntiSpam-Logs",
						it: "Log AntiSpam",
						"pt-BR": "Logs do AntiSpam",
						pl: "Logi AntiSpam"
					},
					value: "antispam"
				},
				{
					name: "Boost Logs",
					name_localizations: {
						fr: "Logs Boost",
						ja: "boost_logs",
						ru: "boost_logs",
						"es-ES": "boost_logs",
						ko: "부스트 로그",
						uk: "Журнали бустів",
						de: "Boost-Logs",
						it: "Log dei boost",
						"pt-BR": "Logs de boosts",
						pl: "Logi boostów"
					},
					value: "boost"
				},
				{
					name: "Channel Logs",
					name_localizations: {
						fr: "Logs Canal",
						ja: "channel_logs",
						ru: "channel_logs",
						"es-ES": "channel_logs",
						ko: "채널 로그",
						uk: "Журнали каналів",
						de: "Kanal-Logs",
						it: "Log dei canali",
						"pt-BR": "Logs de canais",
						pl: "Logi kanałów"
					},
					value: "channel"
				},
				{
					name: "Messages Logs",
					name_localizations: {
						fr: "Logs Messages",
						ja: "messages_logs",
						ru: "messages_logs",
						"es-ES": "messages_logs",
						ko: "메시지 로그",
						uk: "Журнали повідомлень",
						de: "Nachrichten-Logs",
						it: "Log dei messaggi",
						"pt-BR": "Logs de mensagens",
						pl: "Logi wiadomości"
					},
					value: "message"
				},
				{
					name: "Moderation Logs",
					name_localizations: {
						fr: "Logs Modération",
						ja: "moderation_logs",
						ru: "moderation_logs",
						"es-ES": "moderation_logs",
						ko: "모더레이션 로그",
						uk: "Журнали модерації",
						de: "Moderations-Logs",
						it: "Log di moderazione",
						"pt-BR": "Logs de moderação",
						pl: "Logi moderacji"
					},
					value: "moderation"
				},
				{
					name: "Roles Logs",
					name_localizations: {
						fr: "Logs Rôles",
						ja: "roles_logs",
						ru: "roles_logs",
						"es-ES": "roles_logs",
						ko: "역할 로그",
						uk: "Журнали ролей",
						de: "Rollen-Logs",
						it: "Log dei ruoli",
						"pt-BR": "Logs de cargos",
						pl: "Logi ról"
					},
					value: "roles"
				},
				{
					name: "Ticket Logs",
					name_localizations: {
						fr: "Logs Ticket",
						ja: "ticket_logs",
						ru: "ticket_logs",
						"es-ES": "ticket_logs",
						ko: "티켓 로그",
						uk: "Журнали тікетів",
						de: "Ticket-Logs",
						it: "Log dei ticket",
						"pt-BR": "Logs de tickets",
						pl: "Logi ticketów"
					},
					value: "ticket"
				},
				{
					name: "Voice Logs",
					name_localizations: {
						fr: "Logs Voice",
						ja: "voice_logs",
						ru: "voice_logs",
						"es-ES": "voice_logs",
						ko: "음성 로그",
						uk: "Журнали голосових каналів",
						de: "Sprach-Logs",
						it: "Log vocali",
						"pt-BR": "Logs de voz",
						pl: "Logi głosowe"
					},
					value: "voice"
				},
				{
					name: "Confession Logs",
					name_localizations: {
						fr: "Logs Confession",
						ja: "confession_logs",
						ru: "confession_logs",
						"es-ES": "confession_logs",
						ko: "고백 로그",
						uk: "Журнали зізнань",
						de: "Geständnis-Logs",
						it: "Log delle confessioni",
						"pt-BR": "Logs de confissões",
						pl: "Logi wyznań"
					},
					value: "confession"
				},
				{
					name: "Economy Logs",
					name_localizations: {
						fr: "Logs d'économie",
						ja: "economy_logs",
						ru: "economy_logs",
						"es-ES": "economy_logs",
						ko: "경제 로그",
						uk: "Журнали економіки",
						de: "Wirtschafts-Logs",
						it: "Log dell'economia",
						"pt-BR": "Logs de economia",
						pl: "Logi ekonomii"
					},
					value: "economy"
				}
			],

			permission: null
		},
		{
			name: "channel",
			type: ApplicationCommandOptionType.Channel,
			channel_types: [ChannelType.GuildText, ChannelType.GuildForum],
			description: "The channel you want your logs message!",
			description_localizations: {
				fr: "Le canal sur lequel vous souhaitez recevoir votre message de journaux",
				ja: "ログメッセージを送信したいチャンネル！",
				ru: "Канал для сообщений логов!",
				"es-ES": "El canal donde quieres tus mensajes de registro!",
				ko: "로그 메시지를 보낼 채널!",
				uk: "Канал для повідомлень журналів!",
				de: "Der Kanal für deine Log-Nachrichten!",
				it: "Il canale per i tuoi messaggi di log!",
				"pt-BR": "O canal para suas mensagens de log!",
				pl: "Kanał dla twoich wiadomości logów!"
			},
			required: false,
			permission: null
		}
	],
	thinking: true,
	category: "guildconfig",
	type: ApplicationCommandType.ChatInput,
	permission: PermissionFlagsBits.Administrator,
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const botUser = client.user;
		const allCreatedChannels: string[] = [];
		const allLogsPossible = [
			{ id: "voice", value: lang.setlogschannel_var_voice },
			{ id: "moderation", value: lang.setlogschannel_var_mods },
			{ id: "message", value: lang.setlogschannel_var_msg },
			{ id: "boosts", value: lang.setlogschannel_var_boost },
			{ id: "roles", value: lang.setlogschannel_var_roles },
			{
				id: "ticket-log-channel",
				value: lang.setlogschannel_var_tickets
			},
			{ id: "antispam", value: lang.setlogschannel_var_antispam },
			{ id: "channel", value: lang.setlogschannel_var_channel },
			{ id: "confession", value: lang.setlogschannel_var_confession },
			{ id: "economy", value: lang.setlogschannel_var_economy }
		];

		const opts = client.func.method.options(interaction, args);
		const type = opts.string("type", 0, true);
		const channel = (await opts.channel("channel", 1)) as Channel | null;

		const createLogsChannel = async (name: string, typeOfLogs: string) => {
			// The command's choices are not the keys read by the events: `boost`
			// was never read (they read `boosts`), nor `ticket` (TICKET.logs).
			const logKey =
				type === "boost"
					? "boosts"
					: type === "ticket"
						? "ticket-log-channel"
						: type;
			if (!channel) {
				await client.func.method.interactionSend(interaction, {
					content: lang.guildprofil_not_logs_set
				});
				return;
			}

			try {
				let already = null;
				if (logKey === "ticket-log-channel") {
					already = await client.db.get(
						`${interaction.guildId}.GUILD.TICKET.logs`
					);
				} else {
					already = await client.db.get(
						`${interaction.guildId}.GUILD.SERVER_LOGS.${logKey}`
					);
				}

				if (already === channel.id) {
					await client.func.method.interactionSend(interaction, {
						content: lang.joinghostping_add_already_set.replace(
							"${channel}",
							channel.toString()
						)
					});
					return;
				}

				const target = interaction.guild?.channels.cache.get(
					channel.id
				);
				const missing = missingLogPermissions(target, botUser);
				if (missing.length > 0) {
					await client.func.method.interactionSend(interaction, {
						content:
							lang.setlogschannel_bot_missing_channel_permissions
								.replace("${channel}", channel.toString())
								.replace(
									"${permissions}",
									formatPermissions(missing)
								)
					});
					return;
				}

				if (target?.type !== ChannelType.GuildForum)
					await (target as BaseGuildTextChannel)
						.send(
							cardPayload(
								notice(
									"success",
									lang.setlogschannel_confirmation_message
										.replace(
											"${emoji_Yes}",
											client.iHorizon_Emojis.Yes
										)
										.replace(
											"${authorId}",
											interaction.member?.user
												.id as string
										)
										.replace("${typeOfLogs}", typeOfLogs)
								)
							)
						)
						.catch(() => null);

				if (logKey === "ticket-log-channel") {
					await client.db.set(
						`${interaction.guildId}.GUILD.TICKET.logs`,
						channel.id
					);
				} else {
					await client.db.set(
						`${interaction.guildId}.GUILD.SERVER_LOGS.${logKey}`,
						channel.id
					);
				}
				// A forum: its post for this type is opened now (its first message says what it is for).
				if (target?.type === ChannelType.GuildForum)
					await client.func.logChannel.getLogChannel(
						target.guild,
						logKey === "ticket-log-channel"
							? "ticket"
							: (logKey as LogType)
					);

				await sendCard(
					client,
					interaction,
					notice(
						"success",
						lang.setlogschannel_command_work
							.replace("${argsidId}", channel.id)
							.replace("${typeOfLogs}", typeOfLogs)
					)
				);

				await client.func.ihorizon_logs(interaction, {
					title: lang.setlogschannel_logs_embed_title,
					description:
						lang.setlogschannel_logs_embed_description_on_enable
							.replaceAll(
								"${authorId}",
								interaction.member?.user.id as string
							)
							.replace("${argsidId}", channel.id)
							.replace("${typeOfLogs}", typeOfLogs)
				});
			} catch (e) {
				logger.err(e);
				await client.func.method.interactionSend(interaction, {
					content: lang.setlogschannel_command_error
				});
			}
		};

		if (type === "auto") {
			if (channel) {
				const target = interaction.guild.channels.cache.get(channel.id);
				const missing = missingLogPermissions(target, botUser);
				if (missing.length > 0) {
					await client.func.method.interactionSend(interaction, {
						content:
							lang.setlogschannel_bot_missing_channel_permissions
								.replace("${channel}", channel.toString())
								.replace(
									"${permissions}",
									formatPermissions(missing)
								)
					});
					return;
				}

				for (const logType of allLogsPossible) {
					if (logType.id === "ticket-log-channel") {
						await client.db.set(
							`${interaction.guildId}.GUILD.TICKET.logs`,
							channel.id
						);
					} else {
						await client.db.set(
							`${interaction.guildId}.GUILD.SERVER_LOGS.${logType.id}`,
							channel.id
						);
					}
				}
				allCreatedChannels.push(channel.id);
				// A forum: one post per log type, opened now.
				if (target?.type === ChannelType.GuildForum)
					for (const logType of allLogsPossible)
						await client.func.logChannel.getLogChannel(
							interaction.guild,
							logType.id === "ticket-log-channel"
								? "ticket"
								: (logType.id as LogType)
						);
				if (target?.type !== ChannelType.GuildForum)
					await (target as BaseGuildTextChannel)
						.send(
							cardPayload(
								notice(
									"success",
									lang.setlogschannel_confirmation_message
										.replace(
											"${emoji_Yes}",
											client.iHorizon_Emojis.Yes
										)
										.replace(
											"${authorId}",
											interaction.member.user.id!
										)
										.replace(
											"${typeOfLogs}",
											allLogsPossible
												.map((x) => x.value)
												.join(",")
										)
								)
							)
						)
						.catch(() => null);

				await sendCard(
					client,
					interaction,
					notice(
						"success",
						lang.setlogschannel_utils_command_work
							.replace("${argsidId}", `<#${channel.id}>`)
							.replace(
								"${typeOfLogs}",
								allLogsPossible.map((x) => x.value).join(", ")
							)
					)
				);
			} else {
				try {
					const existingLogs: Record<string, string> = {};
					let existingCategory: CategoryChannel | null = null;

					for (const logType of allLogsPossible) {
						let channelId: string | null = null;

						if (logType.id === "ticket-log-channel") {
							channelId = await client.db.get(
								`${interaction.guildId}.GUILD.TICKET.logs`
							);
						} else {
							channelId = await client.db.get(
								`${interaction.guildId}.GUILD.SERVER_LOGS.${logType.id}`
							);
						}

						// A saved channel only counts if it still exists and the bot
						// can post in it: otherwise a new one is created.
						const guildChannel = channelId
							? interaction.guild.channels.cache.get(channelId)
							: undefined;
						if (
							!guildChannel ||
							missingLogPermissions(guildChannel, botUser)
								.length > 0
						) {
							continue;
						}
						existingLogs[logType.id] = guildChannel.id;

						// New channels join the category of the first usable one,
						// when the bot can create channels there.
						const parent = guildChannel.parent;
						if (
							!existingCategory &&
							parent?.type === ChannelType.GuildCategory &&
							parent
								.permissionsFor(botUser)
								?.has([
									PermissionFlagsBits.ViewChannel,
									PermissionFlagsBits.ManageChannels
								])
						) {
							existingCategory = parent;
						}
					}

					const missingLogs = allLogsPossible.filter(
						(logType) => !existingLogs[logType.id]
					);

					if (missingLogs.length === 0) {
						await client.func.method.interactionSend(interaction, {
							content: lang.setlogschannel_all_already_exist
						});
						return;
					}

					const botPermissions =
						interaction.guild.members.me?.permissions;
					const missingSetup = botPermissions
						? botPermissions.missing(AUTO_SETUP_PERMISSIONS)
						: new PermissionsBitField(
								AUTO_SETUP_PERMISSIONS
							).toArray();
					if (missingSetup.length > 0) {
						await client.func.method.interactionSend(interaction, {
							content:
								lang.setlogschannel_bot_missing_permissions.replace(
									"${permissions}",
									formatPermissions(missingSetup)
								)
						});
						return;
					}

					if (!existingCategory) {
						existingCategory =
							await interaction.guild.channels.create({
								name: "LOGS",
								type: ChannelType.GuildCategory,
								permissionOverwrites: [
									{
										id: interaction.guild.roles.everyone.id,
										deny: [
											PermissionFlagsBits.ViewChannel,
											PermissionFlagsBits.SendMessages,
											PermissionFlagsBits.ReadMessageHistory
										]
									},
									botLogOverwrite(botUser)
								]
							});
					}

					const category = existingCategory;
					const overwrites: OverwriteResolvable[] = [
						...category.permissionOverwrites.cache
							.filter((overwrite) => overwrite.id !== botUser.id)
							.values(),
						botLogOverwrite(botUser)
					];

					for (const logType of missingLogs) {
						const newChannel =
							await interaction.guild.channels.create({
								name: logType.value,
								parent: category.id,
								permissionOverwrites: overwrites,
								type: ChannelType.GuildText
							});
						allCreatedChannels.push(newChannel.id);

						await newChannel
							.send(
								cardPayload(
									notice(
										"success",
										lang.setlogschannel_confirmation_message
											.replace(
												"${emoji_Yes}",
												client.iHorizon_Emojis.Yes
											)
											.replace(
												"${authorId}",
												interaction.member.user.id!
											)
											.replace(
												"${typeOfLogs}",
												logType.value
											)
									)
								)
							)
							.catch(() => null);

						if (logType.id === "ticket-log-channel") {
							await client.db.set(
								`${interaction.guildId}.GUILD.TICKET.logs`,
								newChannel.id
							);
						} else {
							await client.db.set(
								`${interaction.guildId}.GUILD.SERVER_LOGS.${logType.id}`,
								newChannel.id
							);
						}
					}

					await sendCard(
						client,
						interaction,
						notice(
							"success",
							lang.setlogschannel_utils_command_work
								.replace(
									"${argsidId}",
									allCreatedChannels
										.map((x) => `<#${x}>`)
										.join(",")
								)
								.replace(
									"${typeOfLogs}",
									missingLogs.map((x) => x.value).join(", ")
								)
						)
					);
				} catch (e) {
					logger.err(e);
					await client.func.method.interactionSend(interaction, {
						content: lang.setlogschannel_command_error
					});
				}
			}
			return;
		}

		if (type === "off") {
			try {
				const checkData = await client.db.get(
					`${interaction.guildId}.GUILD.SERVER_LOGS`
				);
				// Nothing set (or an empty leftover): nothing deleted, nothing logged.
				if (
					!checkData ||
					(typeof checkData === "object" &&
						Object.keys(checkData).length === 0)
				) {
					await client.func.method.interactionSend(interaction, {
						content: lang.setlogschannel_already_deleted
					});
					return;
				}

				await client.db.delete(
					`${interaction.guildId}.GUILD.SERVER_LOGS`
				);
				// Logged only once something was actually deleted.
				await client.func.ihorizon_logs(interaction, {
					title: lang.setlogschannel_logs_embed_title,
					description:
						lang.setlogschannel_logs_embed_description_on_off.replaceAll(
							"${authorId}",
							interaction.member.user.id!
						)
				});
				await sendCard(
					client,
					interaction,
					notice(
						"success",
						lang.setlogschannel_command_work_on_delete.replace(
							"${guildName}",
							interaction.guild?.name as string
						)
					)
				);
			} catch (e) {
				logger.err(e);
				await client.func.method.interactionSend(interaction, {
					content: lang.setlogschannel_command_error
				});
			}
			return;
		}

		const typeOfLogsMap: { [key: string]: string } = {
			roles: lang.setlogschannel_var_roles,
			moderation: lang.setlogschannel_var_mods,
			voice: lang.setlogschannel_var_voice,
			message: lang.setlogschannel_var_msg,
			boost: lang.setlogschannel_var_boost,
			ticket: lang.setlogschannel_var_tickets,
			antispam: lang.setlogschannel_var_antispam,
			channel: lang.setlogschannel_var_channel,
			confession: lang.setlogschannel_var_confession,
			economy: lang.setlogschannel_var_economy
		};

		if (type && type in typeOfLogsMap) {
			await createLogsChannel(type, typeOfLogsMap[type]);
		}
	}
};

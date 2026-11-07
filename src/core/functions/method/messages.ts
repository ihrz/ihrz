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
	Message,
	User,
	EmbedBuilder,
	Client,
	ChatInputCommandInteraction,
	MessageReplyOptions,
	InteractionEditReplyOptions,
	MessageEditOptions,
	InteractionReplyOptions,
	SnowflakeUtil,
	AnySelectMenuInteraction,
	BaseGuildTextChannel,
	Guild,
	time,
	ButtonBuilder,
	ActionRow,
	ActionRowBuilder,
	ComponentType,
	MessageActionRowComponent,
	ButtonComponent,
	MessagePayload,
	StringSelectMenuInteraction,
	ModalSubmitInteraction
} from "discord.js";
import { Command } from "../../../../types/command.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { getPermissionByValue } from "../permissonsCalculator.js";
import { boldStringifyOption, hasSubCommand } from "./args.js";
import {
	addTopggButonToTheActualComponents,
	shouldAdvertiseTheTopggVoteButton
} from "./topgg.js";

export async function createAwesomeEmbed(
	lang: LanguageData,
	command: Command,
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message
): Promise<EmbedBuilder> {
	const commandName = command.prefixName || command.name;
	const cleanCommandName =
		commandName.charAt(0).toUpperCase() + commandName.slice(1);
	const botPrefix = await client.func.prefix.guildPrefix(
		client,
		interaction.guildId!
	);
	let cleanBotPrefix = botPrefix.string;

	if (botPrefix.type === "mention")
		cleanBotPrefix = lang.hybridcommands_global_prefix_mention;

	const embed = new EmbedBuilder()
		.setTitle(
			lang.hybridcommands_embed_help_title.replace(
				"${commandName}",
				cleanCommandName
			)
		)
		.setColor("LightGrey");

	embed.setFooter(
		await client.func.displayBotName.footerBuilder(interaction.guildId!)
	);

	if (hasSubCommand(command.options)) {
		command.options?.map((x) => {
			const shortCommandName = x.prefixName || x.name;
			const pathString = boldStringifyOption(x.options || []);

			const aliases =
				x.aliases?.map((x) => `\`${x}\``).join(", ") ||
				lang.setjoinroles_var_none;
			const use = `${cleanBotPrefix}${shortCommandName} ${pathString}`;

			embed.addFields({
				name: `${cleanBotPrefix}${shortCommandName}`,
				value: lang.hybridcommands_embed_help_fields_value
					.replace("${aliases}", aliases)
					.replace("${use}", use)
			});
		});
	} else {
		const fetchFullCommandName = interaction.client.content.find(
			(c) => c.desc === command.description
		);
		let CommandsPerm = (await client.db.get(
			`${interaction.guildId}.UTILS.PERMS.${fetchFullCommandName?.cmd}`
		)) as DatabaseStructure.UtilsPermsData[""] | undefined;

		if (typeof CommandsPerm === "number") {
			CommandsPerm = {
				users: [],
				roles: [],
				level: CommandsPerm
			};
		}
		const pathString = boldStringifyOption(command.options || []);
		let perm: DatabaseStructure.PermLevel | string | undefined | null = "";

		if (command.permission) {
			const perm_cmd = getPermissionByValue(command.permission);
			if (perm_cmd) {
				if (Array.isArray(perm_cmd)) {
					// If it's an array of permissions, join their names
					// Filter out any null values before mapping
					perm = perm_cmd
						.filter((p): p is NonNullable<typeof p> => p !== null)
						.map((p) => lang[p.name])
						.join(", ");
				} else {
					// Single permission case
					perm = lang[perm_cmd.name];
				}
			}
		}

		if (CommandsPerm?.level) {
			perm = CommandsPerm.level;
		}

		if (CommandsPerm?.roles && CommandsPerm?.roles.length > 0) {
			perm = CommandsPerm.roles.map((x) => `<@&${x}>`).join(", ");
		}

		if (CommandsPerm?.users && CommandsPerm?.users.length > 0) {
			perm += CommandsPerm.users.map((x) => `<@${x}>`).join(", ");
		}

		embed.setDescription(
			(
				await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`)
			)?.startsWith("fr-")
				? command.description_localizations["fr"]
				: command.description
		);
		embed.setFields(
			{
				name: lang.var_usage,
				value: `${cleanBotPrefix}${command.prefixName || command.name} ${pathString}`,
				inline: false
			},
			{
				name: lang.var_permission,
				value: `${lang.var_permission}: ${perm === "" ? lang.setjoinroles_var_none : perm}`,
				inline: false
			},
			{
				name: lang.var_aliases,
				value:
					command.aliases?.map((x) => `\`${x}\``).join(", ") ||
					lang.setjoinroles_var_none,
				inline: false
			}
		);
	}

	return embed;
}

export async function interactionSend(
	interaction:
		| ChatInputCommandInteraction<"cached">
		| ChatInputCommandInteraction
		| Message
		| StringSelectMenuInteraction<"cached">
		| ModalSubmitInteraction<"cached">,
	options:
		| string
		| MessageReplyOptions
		| MessageEditOptions
		| InteractionReplyOptions
): Promise<Message> {
	const nonce = SnowflakeUtil.generate().toString();

	if (
		interaction instanceof ChatInputCommandInteraction ||
		interaction instanceof StringSelectMenuInteraction ||
		interaction instanceof ModalSubmitInteraction
	) {
		const editOptions: InteractionReplyOptions =
			typeof options === "string"
				? { content: options }
				: { ...(options as InteractionReplyOptions) };

		if (
			await shouldAdvertiseTheTopggVoteButton(interaction.user.id || "")
		) {
			editOptions.components = await addTopggButonToTheActualComponents(
				editOptions.components || []
			);
		}

		if (interaction.replied) {
			return await interaction.editReply(
				editOptions as InteractionEditReplyOptions
			);
		} else if (interaction.deferred) {
			await interaction.editReply(
				editOptions as InteractionEditReplyOptions
			);
			return await interaction.fetchReply();
		} else {
			await interaction.reply({ ...editOptions });
			return await interaction.fetchReply();
		}
	} else {
		let replyOptions: MessageReplyOptions;
		if (typeof options === "string") {
			replyOptions = {
				content: options,
				allowedMentions: { repliedUser: false }
			};
		} else {
			replyOptions = {
				...(options as MessageReplyOptions),
				allowedMentions: { repliedUser: false, roles: [], users: [] },
				content: options.content ?? undefined,
				nonce: nonce,
				enforceNonce: true
			};
		}

		try {
			return await interaction.reply(replyOptions);
		} catch {
			return await interaction.edit(replyOptions as MessageEditOptions);
		}
	}
}

export async function channelSend(
	interaction:
		| string
		| Message
		| ChatInputCommandInteraction<"cached">
		| AnySelectMenuInteraction<"cached">
		| BaseGuildTextChannel,
	options: string | MessageReplyOptions | MessageEditOptions
): Promise<Message> {
	const replyOptions: MessageReplyOptions =
		typeof options === "string"
			? { content: options, allowedMentions: { repliedUser: false } }
			: ({
					...options,
					content: options.content ?? undefined,
					nonce: SnowflakeUtil.generate().toString(),
					enforceNonce: true
				} as MessageReplyOptions);

	const channelId =
		typeof interaction === "string"
			? interaction
			: interaction instanceof BaseGuildTextChannel
				? interaction.id
				: interaction.channel?.id;

	if (!channelId) throw new Error("Channel not found");

	return sendToChannel(channelId, replyOptions);
}

async function sendToChannel(
	channelId: string,
	options: MessageReplyOptions
): Promise<Message> {
	const optionsWithFreshNonce = {
		...options,
		nonce: SnowflakeUtil.generate().toString(),
		enforceNonce: true
	};

	logger.debug("[sendToChannel] called with channelId:", channelId);
	logger.debug(
		"[sendToChannel] client.shard:",
		client.shard ? `shard ${client.shard.ids}` : "no shard"
	);
	logger.debug(
		"[sendToChannel] channel in cache:",
		client.channels.cache.has(channelId)
	);

	if (!client.shard) {
		logger.debug("[sendToChannel] no shard, fetching channel directly...");
		const channel = (await client.channels.fetch(
			channelId
		)) as BaseGuildTextChannel;
		logger.debug(
			"[sendToChannel] channel fetched:",
			channel?.id,
			channel?.name
		);
		const msg = await channel.send(optionsWithFreshNonce);
		logger.debug("[sendToChannel] message sent:", msg.id);
		return msg;
	}

	if (client.channels.cache.has(channelId)) {
		logger.debug(
			"[sendToChannel] channel found in cache, sending directly..."
		);
		const ch = client.channels.cache.get(channelId) as BaseGuildTextChannel;
		logger.debug(
			"[sendToChannel] channel name:",
			ch.name,
			"| guild:",
			ch.guild?.name
		);

		try {
			const msg = await (
				client.channels.cache.get(channelId) as BaseGuildTextChannel
			).send(optionsWithFreshNonce);
			logger.debug("[sendToChannel] message sent from cache:", msg.id);
			return msg;
		} catch (e) {
			logger.debug("[sendToChannel] send from cache FAILED:", e);
			throw e;
		}
	}

	logger.debug(
		"[sendToChannel] channel not in cache, using broadcastEval..."
	);
	const results = await client.shard.broadcastEval(
		async (c, { channelId, options }) => {
			const channel = c.channels.cache.get(channelId) as
				BaseGuildTextChannel | undefined;
			logger.debug(
				`[broadcastEval shard ${c.shard?.ids}] channel found:`,
				!!channel
			);
			if (!channel) return null;

			const { SnowflakeUtil } = await import("discord.js");
			const freshOptions = {
				...options,
				nonce: SnowflakeUtil.generate().toString(),
				enforceNonce: true
			};

			try {
				const msg = await channel.send(
					freshOptions as unknown as MessagePayload
				);
				logger.debug(
					`[broadcastEval shard ${c.shard?.ids}] message sent:`,
					msg.id
				);
				return { id: msg.id, channelId: msg.channelId };
			} catch (e) {
				logger.debug(
					`[broadcastEval shard ${c.shard?.ids}] send FAILED:`,
					e
				);
				return null;
			}
		},
		{ context: { channelId, options } }
	);

	logger.debug("[sendToChannel] broadcastEval results:", results);

	const result = results.find(Boolean);
	if (!result) throw new Error(`Channel ${channelId} not found on any shard`);
	return {
		id: result.id,
		channelId: result.channelId,
		content: options.content ?? ""
	} as Message;
}

export async function reply(
	message: Message<boolean>,
	options: string | MessageReplyOptions
): Promise<Message> {
	const nonce = SnowflakeUtil.generate().toString();
	let replyOptions: MessageReplyOptions | MessagePayload;

	if (typeof options === "string") {
		replyOptions = {
			content: options,
			allowedMentions: { repliedUser: false }
		};
	} else {
		replyOptions = {
			...options,
			content: options.content ?? undefined,
			nonce: nonce,
			enforceNonce: true
		} as MessageReplyOptions;
	}

	return await message.reply(replyOptions);
}

export function generateCustomMessagePreview(
	message: string,
	input: {
		guild: Guild;
		user: User;
		guildLocal: string;
		inviter?: {
			user: {
				username: string;
				mention: string;
			};
			invitesAmount: number;
		};
		ranks?: {
			level: number;
		};
		notifier?: {
			artistAuthor: string;
			artistLink: string;
			mediaURL: string;
		};
		blogger?: {
			articleTitle: string;
			articleAuthor: string;
			articleLink: string;
			blogName: string;
		};
	}
): string {
	return message
		.replaceAll("{memberUsername}", input.user.username)
		.replaceAll("{memberMention}", input.user.toString())
		.replaceAll("{memberCount}", input.guild.memberCount?.toString()!)
		.replaceAll(
			"{createdAt}",
			input.user.createdAt.toLocaleDateString(input.guildLocal)
		)
		.replaceAll(
			"{accountCreationTimestamp}",
			time(input.user.createdAt, "R")
		)
		.replaceAll("{guildName}", input.guild.name)
		.replaceAll(
			"{inviterUsername}",
			input.inviter?.user.username || `unknow_user`
		)
		.replaceAll(
			"{inviterMention}",
			input.inviter?.user.mention || `@unknow_user`
		)
		.replaceAll(
			"{invitesCount}",
			input.inviter?.invitesAmount.toString() || "1337"
		)
		.replaceAll("{xpLevel}", input.ranks?.level.toString() || "1337")
		.replaceAll("{artistAuthor}", input.notifier?.artistAuthor || "Ninja")
		.replaceAll(
			"{artistLink}",
			input.notifier?.artistLink || "https://twitch.tv/Ninja"
		)
		.replaceAll(
			"{mediaURL}",
			input.notifier?.mediaURL || "https://twitch.tv/Ninja/media"
		)
		.replaceAll(
			"{articleTitle}",
			input.blogger?.articleTitle || "Unknow Article"
		)
		.replaceAll(
			"{articleAuthor}",
			input.blogger?.articleAuthor || "Unknown Author"
		)
		.replaceAll(
			"{articleLink}",
			input.blogger?.articleLink || "Unknown Link"
		)
		.replaceAll(
			"{blogName}",
			input.blogger?.blogName || "Unknown Blog Name"
		);
}

export async function buttonReact(
	msg: Message,
	button: ButtonBuilder
): Promise<Message> {
	const comp = msg.components as ActionRow<MessageActionRowComponent>[];
	let isAdd = false;

	if (comp.length >= 5) {
		throw "Too much components on this message!";
	}

	for (const lines of comp) {
		if (
			(lines as ActionRow<MessageActionRowComponent>).components.length <
				5 &&
			!isAdd
		) {
			if (
				(lines as ActionRow<MessageActionRowComponent>).components.find(
					(x: MessageActionRowComponent) =>
						x.type === ComponentType.Button
				)
			) {
				const newActionRow = ActionRowBuilder.from(
					lines as ActionRow<MessageActionRowComponent>
				);

				newActionRow.addComponents(button);
				comp[comp.indexOf(lines)] =
					newActionRow.toJSON() as ActionRow<MessageActionRowComponent>;
				isAdd = true;
				break;
			}
		}
	}

	if (!isAdd) {
		const newActionRow =
			new ActionRowBuilder<ButtonBuilder>().addComponents(button);
		comp.push(
			newActionRow.toJSON() as ActionRow<MessageActionRowComponent>
		);
	}

	await msg.edit({ components: comp });

	return msg;
}

export async function buttonUnreact(
	msg: Message,
	buttonEmoji: string
): Promise<Message> {
	const comp = msg.components as ActionRow<MessageActionRowComponent>[];
	let isRemoved = false;

	const newComp: ActionRow<MessageActionRowComponent>[] = [];

	for (let i = 0; i < comp.length; i++) {
		const actionRow = comp[i] as ActionRow<MessageActionRowComponent>;
		const newComponents = actionRow.components.filter(
			(component: MessageActionRowComponent) => {
				if (
					component.type === ComponentType.Button &&
					(component as ButtonComponent).emoji?.id === buttonEmoji
				) {
					isRemoved = true;
					return false;
				}
				return true;
			}
		);

		if (newComponents.length > 0) {
			newComp.push({
				type: 1,
				components: newComponents
			} as ActionRow<MessageActionRowComponent>);
		}
	}

	if (!isRemoved) return msg;

	await msg.edit({ components: newComp });
	return msg;
}

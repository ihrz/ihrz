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
	Channel,
	User,
	Role,
	GuildMember,
	ChannelType,
	BaseGuildVoiceChannel,
	EmbedBuilder,
	Client,
	ChatInputCommandInteraction,
	MessageReplyOptions,
	InteractionEditReplyOptions,
	MessageEditOptions,
	InteractionReplyOptions,
	ApplicationCommandOptionType,
	SnowflakeUtil,
	AnySelectMenuInteraction,
	BaseGuildTextChannel,
	PermissionFlagsBits,
	Guild,
	time,
	ButtonBuilder,
	ActionRow,
	ActionRowBuilder,
	ComponentType,
	MessageActionRowComponent,
	ButtonComponent,
	PermissionsBitField,
	Collection,
	Attachment,
	MessagePayload,
	ButtonStyle,
	ActionRowData,
	APIMessageTopLevelComponent,
	JSONEncodable,
	MessageActionRowComponentBuilder,
	MessageActionRowComponentData,
	TopLevelComponentData,
	StringSelectMenuInteraction,
	ModalSubmitInteraction
} from "discord.js";
import { Command } from "../../../types/command.js";
import { Option } from "../../../types/option.js";
import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { generatePassword } from "./random.js";
import { getPermissionByValue } from "./permissonsCalculator.js";
import { apiTable } from "../../Events/client/ready.js";

export function isNumber(str: string): boolean {
	return !isNaN(Number(str)) && str.trim() !== "";
}

export async function user(
	message: Message,
	args: string[],
	argsNumber: number
): Promise<User | null> {
	const userId = /[<@!>]/g.test(args[argsNumber]);

	let user: User | null = null;

	if (message.mentions.parsedUsers.size >= 1) {
		// if the prefix is the bot mention we have to do a specific traitment
		let prefix_mention = message.content.startsWith(`<@${client.user?.id}`);
		if (prefix_mention) {
			user = message.mentions.parsedUsers
				.map((x) => x)
				.filter((x) => x.id !== client.user?.id!)[argsNumber];
		} else {
			user = message.mentions.parsedUsers.map((x) => x)?.[argsNumber];
		}
		// if the command argument is a <@ID>
	} else if (userId) {
		user = await message.client.users
			.fetch(args[argsNumber].replace(/[<@!>]/g, ""))
			.catch(() => null);
		// if the user sent a id
	} else if (isNumber(args[argsNumber])) {
		user = await client.users.fetch(args[argsNumber]).catch(() => null);
		// if the user sent a username of the user in the command argument
	} else if (
		message.guild?.members.cache.find(
			(x) => x.user.username === args[argsNumber]
		)?.user
	) {
		user =
			message.guild?.members.cache.find(
				(x) => x.user.username === args[argsNumber]
			)?.user || null;
	}

	return user;
}

export function member(
	message: Message,
	args: string[],
	argsNumber: number
): GuildMember | null {
	const userId = /[<@!>]/g.test(args[argsNumber]);

	let user: GuildMember | null = null;

	if ((message.mentions.members?.size || 0) >= 1) {
		// if the prefix is the bot mention we have to do a specific traitment
		let prefix_mention = message.content.startsWith(`<@${client.user?.id}`);
		if (prefix_mention) {
			user =
				message.mentions.members
					?.map((x) => x)
					.filter((x) => x.id !== client.user?.id!)[argsNumber] ||
				null;
		} else {
			user =
				message.mentions.members?.map((x) => x)?.[argsNumber] || null;
		}
		// if the command argument is a <@ID>
	} else if (userId) {
		user =
			message.guild?.members.cache.get(
				args[argsNumber].replace(/[<@!>]/g, "")
			) || null;
		// if the user sent a id
	} else if (
		isNumber(args[argsNumber]) &&
		message.guild?.members.cache.get(args[argsNumber])
	) {
		user = message.guild?.members.cache.get(args[argsNumber]) || null;
		// if the user sent a username of the user in the command argument
	} else if (
		message.guild?.members.cache.find(
			(x) => x.user.username === args[argsNumber]
		)
	) {
		user =
			message.guild?.members.cache.find(
				(x) => x.user.username === args[argsNumber]
			) || null;
	}

	return user;
}

export async function voiceChannel(
	interaction: Message,
	args: string[],
	argsNumber: number
): Promise<BaseGuildVoiceChannel | null> {
	// Get potential channel ID from argument, strip any channel mention formatting
	const channelId = args[argsNumber]?.replace(/[<#>]/g, "");

	// First try from mentions
	const mentionedChannel = interaction.mentions.channels
		.map((x) => x)
		.filter(
			(x) =>
				x.type === ChannelType.GuildVoice ||
				x.type === ChannelType.GuildStageVoice
		)[argsNumber] as BaseGuildVoiceChannel;

	const channelFromName = interaction.guild?.channels.cache.find(
		(x) =>
			x.name === args[argsNumber] &&
			(x.type === ChannelType.GuildVoice ||
				x.type === ChannelType.GuildStageVoice)
	);

	if (channelFromName) return channelFromName as BaseGuildVoiceChannel;
	if (mentionedChannel) return Promise.resolve(mentionedChannel);

	// Then try to fetch by ID if it's a valid ID format
	if (channelId && /^\d+$/.test(channelId)) {
		// Try from cache first
		const channelFromCache =
			interaction.guild?.channels.cache.get(channelId);
		if (
			channelFromCache &&
			(channelFromCache.type === ChannelType.GuildVoice ||
				channelFromCache.type === ChannelType.GuildStageVoice)
		) {
			return Promise.resolve(channelFromCache as BaseGuildVoiceChannel);
		}

		// If not in cache, try to fetch it
		const fetchedChannel = await interaction.guild?.channels
			.fetch(channelId)
			.catch(() => null);
		if (
			fetchedChannel &&
			(fetchedChannel.type === ChannelType.GuildVoice ||
				fetchedChannel.type === ChannelType.GuildStageVoice)
		) {
			return fetchedChannel as BaseGuildVoiceChannel;
		}
		return null;
	}

	return null;
}

export async function channel(
	interaction: Message,
	args: string[],
	argsNumber: number
): Promise<Channel | null> {
	// First of all, if the args is the channel name
	const channelFromName = interaction.guild?.channels.cache.find(
		(x) => x.name === args[argsNumber]
	);
	if (channelFromName) {
		return channelFromName;
	}
	// Get potential channel ID from argument, strip any channel mention formatting
	const channelId = args[argsNumber]?.replace(/[<#>]/g, "");

	// First try from mentions
	const mentionedChannel = interaction.mentions.channels.map((x) => x)[
		argsNumber
	];

	if (mentionedChannel) return mentionedChannel;

	// Then try to fetch by ID if it's a valid ID format
	if (channelId && /^\d+$/.test(channelId)) {
		const channelFromId = interaction.guild?.channels.cache.get(channelId);
		if (channelFromId) return channelFromId;

		// If not in cache, try to fetch it
		const fetchedChannel = await interaction.guild?.channels
			.fetch(channelId)
			.catch(() => null);
		return fetchedChannel || null;
	}

	return null;
}

export function role(
	interaction: Message,
	args: string[],
	argsNumber: number
): Role | null {
	const roleEntry = args[argsNumber]?.replace(/[<@&>]/g, "");
	return (
		interaction.mentions.roles.map((x) => x)[argsNumber] ||
		(roleEntry ? interaction.guild?.roles.cache.get(roleEntry) : null) ||
		interaction.guild?.roles.cache.find((x) => x.name === roleEntry) ||
		null
	);
}

export function string(args: string[], argsNumber: number): string | null {
	return args[argsNumber] || null;
}

export function longString(args: string[], argsNumber: number): string | null {
	return args.slice(argsNumber).join(" ") || null;
}

export function number(args: string[], argsNumber: number): number {
	const value = args[argsNumber];
	return Number.isNaN(parseInt(value)) ? 0 : parseInt(value);
}

export function getArgumentOptionNameWithOptions(o: Option): string {
	if (o.choices) {
		return o.choices.map((x) => x.value).join("/");
	}
	return o.name;
}

type ArgumentType =
	| "string"
	| "user"
	| "roles"
	| "number"
	| "channel"
	| "attachment"
	| "unknown";

const getArgumentOptionType = (
	type: ApplicationCommandOptionType
): ArgumentType => {
	switch (type) {
		case ApplicationCommandOptionType.String:
			return "string";
		case ApplicationCommandOptionType.User:
			return "user";
		case ApplicationCommandOptionType.Role:
			return "roles";
		case ApplicationCommandOptionType.Number:
		case ApplicationCommandOptionType.Integer:
			return "number";
		case ApplicationCommandOptionType.Channel:
			return "channel";
		case ApplicationCommandOptionType.Attachment:
			return "attachment";
		default:
			return "unknown";
	}
};

const getArgumentOptionTypeWithOptions = (o: Option): string => {
	if (o.choices) {
		return o.choices.map((x) => x.value).join("/");
	}
	return getArgumentOptionType(o.type);
};

export function stringifyOption(option: Option[]): string {
	let _ = "";
	option.forEach((value) => {
		_ += value.required ? "[" : "<";
		_ += getArgumentOptionNameWithOptions(value);
		_ += value.required ? "]" + " " : ">" + " ";
	});
	return _.trim();
}

export function boldStringifyOption(option: Option[]): string {
	let _ = "";
	option.forEach((value) => {
		_ += value.required ? "**`[" : "**`<";
		_ += getArgumentOptionNameWithOptions(value);
		_ += value.required ? "]`**" + " " : ">`**" + " ";
	});
	return _.trim();
}

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

interface ArgumentBrief {
	name: string;
	type: string;
	required: boolean;
	longString?: boolean;
}

export async function checkCommandArgs(
	message: Message,
	command: Command,
	args: string[],
	lang: LanguageData
): Promise<boolean> {
	if (!command) return false;

	const botPrefix = await message.client.func.prefix.guildPrefix(
		message.client,
		message.guildId!
	);
	let cleanBotPrefix = botPrefix.string;

	if (botPrefix.type === "mention") {
		cleanBotPrefix = lang.hybridcommands_global_prefix_cleaned_mention;
	}

	const expectedArgs: ArgumentBrief[] = [];
	const attachmentArgs: ArgumentBrief[] = [];

	command.options?.forEach((option) => {
		const argType = getArgumentOptionTypeWithOptions(option);
		const argBrief = {
			name: option.name,
			type: argType,
			required: option.required || false,
			longString: option.type === 3 && !option.choices
		};

		if (argType === "attachment") {
			attachmentArgs.push(argBrief);
		} else {
			expectedArgs.push(argBrief);
		}
	});

	// Only count non-attachment arguments for minimum args validation
	const minArgsCount = expectedArgs.filter((arg) => arg.required).length;
	const isLastArgLongString =
		expectedArgs.length > 0 &&
		expectedArgs[expectedArgs.length - 1].longString;

	if (
		!Array.isArray(args) ||
		args.length < minArgsCount ||
		(args.length === 1 && args[0] === "")
	) {
		const missingIndex = args.length;
		await sendErrorMessage(
			lang,
			message,
			cleanBotPrefix,
			command,
			expectedArgs,
			missingIndex
		);
		return false;
	}

	if (isLastArgLongString) {
		const lastArgIndex = expectedArgs.length - 1;
		if (args.length > lastArgIndex) {
			args[lastArgIndex] = args.slice(lastArgIndex).join(" ");
			args.splice(lastArgIndex + 1);
		}
	}

	// Validate text-based arguments
	for (let i = 0; i < expectedArgs.length; i++) {
		if (i >= args.length && !expectedArgs[i].required) {
			continue;
		} else if (i >= args.length && expectedArgs[i].required) {
			await sendErrorMessage(
				lang,
				message,
				cleanBotPrefix,
				command,
				[...expectedArgs, ...attachmentArgs],
				i
			);
			return false;
		} else if (
			i < args.length &&
			!isValidArgument(args[i], expectedArgs[i].type, message.guild!)
		) {
			await sendErrorMessage(
				lang,
				message,
				cleanBotPrefix,
				command,
				[...expectedArgs, ...attachmentArgs],
				i
			);
			return false;
		}
	}

	// Validate attachment arguments separately
	for (const attachmentArg of attachmentArgs) {
		if (
			attachmentArg.required &&
			(!message.attachments || message.attachments.size === 0)
		) {
			// Find the index of this attachment argument in the original command options
			const originalIndex =
				command.options?.findIndex(
					(opt) => opt.name === attachmentArg.name
				) ?? -1;
			await sendErrorMessage(
				lang,
				message,
				cleanBotPrefix,
				command,
				[...expectedArgs, ...attachmentArgs],
				originalIndex
			);
			return false;
		}
	}

	return true;
}

function isValidArgument(arg: string, type: string, guild: Guild): boolean {
	if (type.includes("/")) {
		return type.split("/").includes(arg);
	}

	switch (type) {
		case "string":
			return typeof arg === "string";
		case "user":
			return (
				/^<@!?(\d+)>$/.test(arg) ||
				!isNaN(Number(arg)) ||
				guild.members.cache.find((x) => x.user.username === arg) !==
				undefined
			);
		case "roles":
			return (
				/^<@&(\d+)>$/.test(arg) ||
				!isNaN(Number(arg)) ||
				guild.roles.cache.find((x) => x.name === arg)?.id !== undefined
			);
		case "number":
			return !isNaN(Number(arg));
		case "channel":
			return (
				/^<#(\d+)>$/.test(arg) ||
				!isNaN(Number(arg)) ||
				guild.channels.cache.find((x) => x.name === arg) !== undefined
			);
		case "unknown":
			return true;
		default:
			return false;
	}
}

async function sendErrorMessage(
	lang: LanguageData,
	message: Message,
	botPrefix: string,
	command: Command,
	expectedArgs: ArgumentBrief[],
	errorIndex: number
): Promise<void> {
	const argument: string[] = [];
	let fullNameCommand: string;

	expectedArgs.forEach((arg) =>
		argument.push(arg.required ? `[${arg.type}]` : `<${arg.type}>`)
	);

	let currentCommand: Command | Option;
	let wrongArgumentName: string = "";
	let errorPosition = "";

	fullNameCommand = command.prefixName || command.name!;
	currentCommand = command;

	errorPosition += " ".padStart(botPrefix.length + fullNameCommand.length);

	argument.forEach((arg, index) => {
		if (errorIndex === index) {
			wrongArgumentName = arg.slice(1, -1);
			errorPosition += " ^";
		} else {
			errorPosition += " ".padStart(arg.length + 1);
		}
	});

	const argsString = argument.join(" ");
	const embed = new EmbedBuilder()
		.setDescription(
			lang.hybridcommands_args_error_embed_desc
				.replace(
					"${currentCommand.name}",
					currentCommand.prefixName || currentCommand.name
				)
				.replace("${botPrefix}", botPrefix)
				.replace("${fullNameCommand}", fullNameCommand)
				.replace("${argsString}", argsString)
				.replace("${errorPosition}", errorPosition)
				.replace("${wrongArgumentName}", wrongArgumentName)
		)
		.setColor("Red")
		.setFooter({
			iconURL: "attachment://footer_icon.png",
			text: lang.hybridcommands_embed_footer_text.replace(
				"${botPrefix}",
				botPrefix
			)
		});

	await message.client.func.method.interactionSend(message, {
		embeds: [embed],
		files: [
			await message.client.func.displayBotName.footerAttachmentBuilder(
				message
			)
		]
	});
}

export async function shouldAdvertiseTheTopggVoteButton(
	authorId: string
): Promise<boolean> {
	return false;
	// const lastVoteTimestamp = (await apiTable.get(`topgg_vote.${authorId}.timestamp`));
	// const isAlreadyNotified = (await apiTable.get(`topgg_vote.${authorId}.notified`) || false);

	// if (isAlreadyNotified) return false;
	// if (!lastVoteTimestamp) return true;

	// const twelveHours = 12 * 60 * 60 * 1000;

	// await apiTable.set(`topgg_vote.${authorId}.notified`, true)

	// return Date.now() - lastVoteTimestamp >= twelveHours;
}

export function generateTopggActionRow(): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(`https://top.gg/bot/${client.user?.id}/vote`)
			.setLabel("Vote for iHorizon")
			.setEmoji(client.iHorizon_Emojis.TOPGG)
	);
}

export type components = readonly (
	| JSONEncodable<APIMessageTopLevelComponent>
	| TopLevelComponentData
	| ActionRowData<
		MessageActionRowComponentData | MessageActionRowComponentBuilder
	>
	| APIMessageTopLevelComponent
)[];

export async function addTopggButonToTheActualComponents(
	current: components
): Promise<components> {
	const topggActionRow = await generateTopggActionRow();

	if (!current || current.length === 0) {
		return [topggActionRow];
	}

	return [...current, topggActionRow];
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
				| BaseGuildTextChannel
				| undefined;
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

export function hasSubCommand(options: Option[] | undefined): boolean {
	if (!options) return false;
	return options.some(
		(option) => option.type === ApplicationCommandOptionType.Subcommand
	);
}

export function hasSubCommandGroup(options: Option[] | undefined): boolean {
	if (!options) return false;
	return options.some(
		(option) => option.type === ApplicationCommandOptionType.SubcommandGroup
	);
}

export function isSubCommand(option: Option | Command): boolean {
	return option.type === ApplicationCommandOptionType.Subcommand;
}

export async function derank(
	user: GuildMember,
	reason?: string
): Promise<void> {
	const user_roles = Array.from(user?.roles.cache.values() || []);
	const role_app = user_roles.find((x) => x.managed);
	if (role_app) {
		await role_app.setPermissions(PermissionFlagsBits.ViewChannel);
	}

	user_roles
		.filter(
			(x) =>
				!x.managed &&
				x.position < x.guild.members.me?.roles.highest.position! &&
				x.id !== x.guild.roles.everyone.id
		)
		.forEach(async (role) => {
			await user?.roles
				.remove(role.id, reason || "Protection")
				.catch(() => { });
		});
}

export async function punish(
	data: DatabaseStructure.ProtectionData,
	user: GuildMember,
	reason?: string
): Promise<void> {
	switch (data?.["SANCTION"]) {
		case "simply":
			break;
		case "simply+derank":
			await derank(user, reason);
			break;
		case "simply+ban":
			user?.ban({ reason: reason || "Protect!" }).catch(async () => {
				await derank(user, reason).catch(() => false);
			});
			break;
		default:
			return;
	}
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

export function findOptionRecursively(
	options: Option[],
	subcommandName: string
): Option | undefined {
	for (const option of options) {
		if (option.name === subcommandName) {
			return option;
		}

		if (
			option.options &&
			(option.type === ApplicationCommandOptionType.SubcommandGroup ||
				option.type === ApplicationCommandOptionType.Subcommand)
		) {
			const foundOption = findOptionRecursively(
				option.options,
				subcommandName
			);
			if (foundOption) {
				return foundOption;
			}
		}
	}
	return undefined;
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

export function isAnimated(attachmentUrl: string): boolean {
	const fileName = attachmentUrl.split("/").pop() || "";
	return fileName.startsWith("a_");
}

export async function warnMember(
	author: GuildMember,
	member: GuildMember,
	reason: string,
	lang: LanguageData
): Promise<string> {
	const warnObject: DatabaseStructure.WarnsData = {
		timestamp: Date.now(),
		reason: reason,
		authorID: author.user.id,
		id: generatePassword({ length: 8, lowercase: false, numbers: true })
	};

	await member.client.db.push(
		`${member.guild.id}.USER.${member.user.id}.WARNS`,
		warnObject
	);

	member
		.send({
			embeds: [
				new EmbedBuilder()
					.setColor("Red")
					.setTitle(
						lang.global_warn_embed_title.replace(
							"${warnObject.id}",
							warnObject.id
						)
					)
					.setDescription(
						lang.global_warn_embed_desc
							.replace("${warnObject.reason}", warnObject.reason)
							.replace(
								"${author.user.username}",
								author.user.username
							)
							.replace(
								"${author.roles.highest.name}",
								author.roles.highest.name
							)
							.replace(
								"${time}",
								time(new Date(warnObject.timestamp))
							)
					)
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setCustomId(`guild-id-${author.guild.id}`)
						.setDisabled(true)
						.setLabel(
							lang.global_warn_component_button_label.replace(
								"${author.guild.name}",
								author.guild.name
							)
						)
				)
			]
		})
		.catch(() => null);

	return warnObject.id;
}

export function getDangerousPermissions(lang: LanguageData): {
	flag: bigint;
	name: string;
}[] {
	const dangerousPermissions = [
		{
			flag: PermissionsBitField.Flags.Administrator,
			name: lang.setjoinroles_var_perm_admin
		},
		{
			flag: PermissionsBitField.Flags.ManageGuild,
			name: lang.setjoinroles_var_perm_manage_guild
		},
		{
			flag: PermissionsBitField.Flags.ManageRoles,
			name: lang.setjoinroles_var_perm_manage_role
		},
		{
			flag: PermissionsBitField.Flags.MentionEveryone,
			name: lang.setjoinroles_var_perm_use_mention
		},
		{
			flag: PermissionsBitField.Flags.BanMembers,
			name: lang.setjoinroles_var_perm_ban_members
		},
		{
			flag: PermissionsBitField.Flags.KickMembers,
			name: lang.setjoinroles_var_perm_kick_members
		},
		{
			flag: PermissionsBitField.Flags.ManageWebhooks,
			name: lang.setjoinroles_var_perm_manage_webhooks
		},
		{
			flag: PermissionsBitField.Flags.ManageChannels,
			name: lang.setjoinroles_var_perm_manage_channels
		},
		{
			flag: PermissionsBitField.Flags.ManageGuildExpressions,
			name: lang.setjoinroles_var_perm_manage_expression
		},
		{
			flag: PermissionsBitField.Flags.ViewCreatorMonetizationAnalytics,
			name: lang.setjoinroles_var_perm_view_monetization_analytics
		}
	];

	return dangerousPermissions;
}

export async function addCoins(
	member: GuildMember,
	coins: number
): Promise<void> {
	await member.client.db.add(
		`${member.guild.id}.USER.${member.id}.ECONOMY.money`,
		coins
	);
}

export async function subCoins(
	member: GuildMember,
	coins: number
): Promise<void> {
	await member.client.db.sub(
		`${member.guild.id}.USER.${member.id}.ECONOMY.money`,
		coins
	);
}

export async function isTicketChannel(
	channel: BaseGuildTextChannel
): Promise<boolean> {
	const allTickets = await channel.client.db.get(
		`${channel.guild.id}.TICKET_ALL`
	);

	if (!allTickets || typeof allTickets !== "object") {
		return false;
	}

	for (const authorId of Object.keys(allTickets)) {
		const ticketsByAuthor = allTickets[authorId];

		if (ticketsByAuthor && typeof ticketsByAuthor === "object") {
			for (const ticketId of Object.keys(ticketsByAuthor)) {
				const ticketData = ticketsByAuthor[ticketId];

				if (ticketData && ticketData.channel === channel.id) {
					return ticketData?.channel === channel.id;
				}
			}
		}
	}
	return false;
}

export async function deleteTicketChannelFromDatabase(
	channel: BaseGuildTextChannel
): Promise<boolean> {
	const allTickets = await channel.client.db.get(
		`${channel.guild.id}.TICKET_ALL`
	);

	if (!allTickets || typeof allTickets !== "object") {
		return false;
	}

	for (const authorId of Object.keys(allTickets)) {
		const ticketsByAuthor = allTickets[authorId];

		if (ticketsByAuthor && typeof ticketsByAuthor === "object") {
			for (const ticketId of Object.keys(ticketsByAuthor)) {
				const ticketData = ticketsByAuthor[ticketId];

				if (ticketData && ticketData.channel === channel.id) {
					await client.db.delete(
						`${channel.guild.id}.TICKET_ALL.${authorId}.${ticketId}`
					);
					return ticketData?.channel === channel.id;
				}
			}
		}
	}
	return false;
}

export function isValidDiscordInvite(input: string): boolean {
	// Clean input by removing whitespace
	const trimmed = input.trim();

	// If empty, return false
	if (!trimmed) {
		return false;
	}

	// Regular expressions for different formats
	const patterns = [
		/^https:\/\/discord\.gg\/[a-zA-Z0-9]+$/, // https://discord.gg/<code>
		/^discord\.gg\/[a-zA-Z0-9]+$/, // discord.gg/<code>
		/^[a-zA-Z0-9]+$/ // <code> only
	];

	// Check if input matches any of the patterns
	return patterns.some((pattern) => pattern.test(trimmed));
}

export function isValidDiscordInviteCode(VanityCode: string): boolean {
	if (VanityCode.length > 32) {
		return false;
	}
	const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/i;
	if (!regex.test(VanityCode)) {
		return false;
	}

	return true;
}

export async function changeVoiceChannelStatus(
	channelId: string,
	status: string
): Promise<boolean> {
	const res = await fetch(
		`https://discord.com/api/v10/channels/${channelId}/voice-status`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bot ${client.token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				status
			})
		}
	);

	if (res.status === 200) return true;
	return false;
}

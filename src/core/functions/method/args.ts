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
	ChatInputCommandInteraction,
	ApplicationCommandOptionType,
	Guild,
	Attachment
} from "discord.js";
import { Command } from "../../../../types/command.js";
import { Option } from "../../../../types/option.js";
import { LanguageData } from "../../../../types/languageData.js";

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

	// if the command argument is a <@ID>
	if (userId) {
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
	const arg = args[argsNumber];
	if (!arg || !interaction.guild) return null;

	const voiceTypes: ChannelType[] = [
		ChannelType.GuildVoice,
		ChannelType.GuildStageVoice
	];

	// Mention / ID
	const channelId = arg.replace(/[<#>]/g, "");

	if (/^\d+$/.test(channelId)) {
		const channel =
			interaction.guild.channels.cache.get(channelId) ??
			(await interaction.guild.channels
				.fetch(channelId)
				.catch(() => null));

		if (channel && voiceTypes.includes(channel.type)) {
			return channel as BaseGuildVoiceChannel;
		}
	}

	// Name / fuzzy name
	const channel = interaction.guild.channels.cache.find((channel) => {
		if (!voiceTypes.includes(channel.type)) return false;

		return client.func.music_proximity.similarity(arg, channel.name) >= 0.6;
	});

	return (channel as BaseGuildVoiceChannel | undefined) ?? null;
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

export type HybridOptions = {
	string(name: string, index: number, required: true): string;
	string(name: string, index: number, required?: boolean): string | null;
	longString(name: string, index: number, required: true): string;
	longString(name: string, index: number, required?: boolean): string | null;
	number(name: string, index: number, required: true): number;
	number(name: string, index: number, required?: boolean): number | null;
	integer(name: string, index: number, required: true): number;
	integer(name: string, index: number, required?: boolean): number | null;
	member(name: string, index: number): GuildMember | null;
	user(name: string, index: number): Promise<User | null>;
	channel(name: string, index: number): Promise<Channel | null>;
	voiceChannel(
		name: string,
		index: number
	): Promise<BaseGuildVoiceChannel | null>;
	role(name: string, index: number): Role | null;
	attachment(name: string): Attachment | null;
};

export function options(
	interaction: ChatInputCommandInteraction | Message,
	args: string[] = []
): HybridOptions {
	const slash = interaction instanceof ChatInputCommandInteraction;

	function read_string(name: string, index: number, required: true): string;
	function read_string(
		name: string,
		index: number,
		required?: boolean
	): string | null;
	function read_string(name: string, index: number, required?: boolean) {
		return slash
			? interaction.options.getString(name, required ?? false)
			: string(args, index);
	}

	function read_longString(
		name: string,
		index: number,
		required: true
	): string;
	function read_longString(
		name: string,
		index: number,
		required?: boolean
	): string | null;
	function read_longString(name: string, index: number, required?: boolean) {
		return slash
			? interaction.options.getString(name, required ?? false)
			: longString(args, index);
	}

	function read_number(name: string, index: number, required: true): number;
	function read_number(
		name: string,
		index: number,
		required?: boolean
	): number | null;
	function read_number(name: string, index: number, required?: boolean) {
		return slash
			? interaction.options.getNumber(name, required ?? false)
			: number(args, index);
	}

	function read_integer(name: string, index: number, required: true): number;
	function read_integer(
		name: string,
		index: number,
		required?: boolean
	): number | null;
	function read_integer(name: string, index: number, required?: boolean) {
		return slash
			? interaction.options.getInteger(name, required ?? false)
			: number(args, index);
	}

	return {
		string: read_string,
		longString: read_longString,
		number: read_number,
		integer: read_integer,
		member(name: string, index: number): GuildMember | null {
			return slash
				? (interaction.options.getMember(name) as GuildMember | null)
				: member(interaction, args, index);
		},
		async user(name: string, index: number): Promise<User | null> {
			return slash
				? interaction.options.getUser(name)
				: await user(interaction, args, index);
		},
		async channel(name: string, index: number): Promise<Channel | null> {
			return slash
				? (interaction.options.getChannel(name) as Channel | null)
				: await channel(interaction, args, index);
		},
		async voiceChannel(
			name: string,
			index: number
		): Promise<BaseGuildVoiceChannel | null> {
			return slash
				? (interaction.options.getChannel(
						name
					) as BaseGuildVoiceChannel | null)
				: await voiceChannel(interaction, args, index);
		},
		role(name: string, index: number): Role | null {
			return slash
				? (interaction.options.getRole(name) as Role | null)
				: role(interaction, args, index);
		},
		attachment(name: string): Attachment | null {
			return slash
				? interaction.options.getAttachment(name)
				: (interaction.attachments.first() ?? null);
		}
	};
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

interface ArgumentBrief {
	name: string;
	type: string;
	required: boolean;
	longString?: boolean;
	channelType?: ChannelType[];
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
		const argBrief: ArgumentBrief = {
			name: option.name,
			type: argType,
			required: option.required || false,
			longString: option.type === 3 && !option.choices,
			channelType: option.channel_types
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
			!(await isValidArgument(
				args[i],
				expectedArgs[i].type,
				message.guild!,
				expectedArgs[i].channelType
			))
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

async function isValidArgument(
	arg: string,
	type: string,
	guild: Guild,
	optArgs?: ChannelType[]
): Promise<boolean> {
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
		case "channel": {
			const mention = /^<#(\d+)>$/.exec(arg);
			const channelId = mention?.[1] ?? (/^\d+$/.test(arg) ? arg : null);

			if (channelId) {
				const channel =
					guild.channels.cache.get(channelId) ??
					(await guild.channels.fetch(channelId).catch(() => null));

				if (channel && (!optArgs || optArgs.includes(channel.type))) {
					return true;
				}
			}

			const query = arg.toLowerCase();

			return guild.channels.cache.some(
				(channel) =>
					(!optArgs || optArgs.includes(channel.type)) &&
					(channel.name.toLowerCase() === query ||
						(query.length >= 3 &&
							client.func.music_proximity.similarity(
								query,
								channel.name
							) >= 0.6))
			);
		}
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
					"${currentCommandName}",
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

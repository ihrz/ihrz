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

import { Message, Channel, User, Role, GuildMember, APIRole, ChannelType, BaseGuildVoiceChannel, EmbedBuilder, Client, ChatInputCommandInteraction, MessageReplyOptions, InteractionEditReplyOptions, MessageEditOptions, InteractionReplyOptions, ApplicationCommandOptionType, SnowflakeUtil, AnySelectMenuInteraction, BaseGuildTextChannel, PermissionFlagsBits, Guild, time, InteractionDeferReplyOptions, ButtonBuilder, ActionRow, ActionRowBuilder, ComponentType, MessageActionRowComponent, ButtonComponent, PermissionsBitField, Collection, Attachment } from "discord.js";
import { Command } from "../../../types/command.js";
import { Option } from "../../../types/option.js";
import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { generatePassword } from "./random.js";
import { getPermissionByValue } from "./permissonsCalculator.js";

export function isNumber(str: string): boolean {
	return !isNaN(Number(str)) && str.trim() !== "";
}

export async function user(interaction: Message, args: string[], argsNumber: number): Promise<User | null> {
	if (interaction.content.startsWith(`<@${interaction.client.user.id}`)) {
		return interaction.mentions.parsedUsers
			.map(x => x)
			.filter(x => x.id !== interaction.client.user?.id!)[argsNumber] || null;
	}

	const userId = args[argsNumber]?.replace(/[<@!>]/g, '');
	return interaction.mentions.parsedUsers.map(x => x)?.[argsNumber] ||
		(userId ? interaction.client.users.fetch(userId).catch(() => null) : null);
}

export function member(interaction: Message, args: string[], argsNumber: number): GuildMember | null {
	if (interaction.content.startsWith(`<@${interaction.client.user.id}`)) {
		return interaction.mentions.members?.map(x => x)
			.filter(x => x.id !== interaction.client.user?.id!)?.[argsNumber] || null;
	}

	const memberId = args[argsNumber]?.replace(/[<@!>]/g, '');
	return interaction.mentions.members?.map(x => x)[argsNumber] ||
		(memberId ? interaction.guild?.members.cache.get(memberId) : null) || null;
}

export async function voiceChannel(interaction: Message, args: string[], argsNumber: number): Promise<BaseGuildVoiceChannel | null> {
	// Get potential channel ID from argument, strip any channel mention formatting
	const channelId = args[argsNumber]?.replace(/[<#>]/g, '');

	// First try from mentions
	const mentionedChannel = interaction.mentions.channels
		.map(x => x)
		.filter(x => x.type === ChannelType.GuildVoice || x.type === ChannelType.GuildStageVoice)
	[argsNumber] as BaseGuildVoiceChannel;

	if (mentionedChannel) return Promise.resolve(mentionedChannel);

	// Then try to fetch by ID if it's a valid ID format
	if (channelId && /^\d+$/.test(channelId)) {
		// Try from cache first
		const channelFromCache = interaction.guild?.channels.cache.get(channelId);
		if (channelFromCache && (channelFromCache.type === ChannelType.GuildVoice || channelFromCache.type === ChannelType.GuildStageVoice)) {
			return Promise.resolve(channelFromCache as BaseGuildVoiceChannel);
		}

		// If not in cache, try to fetch it
		const fetchedChannel = await interaction.guild?.channels.fetch(channelId).catch(() => null);
		if (fetchedChannel && (fetchedChannel.type === ChannelType.GuildVoice || fetchedChannel.type === ChannelType.GuildStageVoice)) {
			return fetchedChannel as BaseGuildVoiceChannel;
		}
		return null;
	}

	return null;
}

export async function channel(interaction: Message, args: string[], argsNumber: number): Promise<Channel | null> {
	// Get potential channel ID from argument, strip any channel mention formatting
	const channelId = args[argsNumber]?.replace(/[<#>]/g, '');

	// First try from mentions
	const mentionedChannel = interaction.mentions.channels
		.map(x => x)[argsNumber];

	if (mentionedChannel) return mentionedChannel;

	// Then try to fetch by ID if it's a valid ID format
	if (channelId && /^\d+$/.test(channelId)) {
		const channelFromId = interaction.guild?.channels.cache.get(channelId);
		if (channelFromId) return channelFromId;

		// If not in cache, try to fetch it
		const fetchedChannel = await interaction.guild?.channels.fetch(channelId).catch(() => null);
		return fetchedChannel || null;
	}

	return null;
}

export function role(interaction: Message, args: string[], argsNumber: number): Role | null {
	const roleId = args[argsNumber]?.replace(/[<@&>]/g, '');
	return interaction.mentions.roles.map(x => x)[argsNumber] ||
		(roleId ? interaction.guild?.roles.cache.get(roleId) : null) || null;
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
		return o.choices.map(x => x.value).join("/");
	}
	return o.name;
};

const getArgumentOptionType = (type: number): string => {
	switch (type) {
		case 3:
			return "string";
		case 6:
			return "user";
		case 8:
			return "roles";
		case 10:
		case 4:
			return "number";
		case 7:
			return "channel";
		default:
			return "default";
	}
};

const getArgumentOptionTypeWithOptions = (o: Option): string => {
	if (o.choices) {
		return o.choices.map(x => x.value).join("/");
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

export async function createAwesomeEmbed(lang: LanguageData, command: Command, client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message): Promise<EmbedBuilder> {
	var commandName = command.prefixName || command.name;
	var cleanCommandName = commandName.charAt(0).toUpperCase() + commandName.slice(1);;
	var botPrefix = await client.func.prefix.guildPrefix(client, interaction.guildId!);
	var cleanBotPrefix = botPrefix.string;

	if (botPrefix.type === "mention") cleanBotPrefix = lang.hybridcommands_global_prefix_mention;

	let embed = new EmbedBuilder()
		.setTitle(lang.hybridcommands_embed_help_title.replace("${commandName}", cleanCommandName))
		.setColor("LightGrey");

	embed.setFooter(await client.func.displayBotName.footerBuilder(interaction));

	if (hasSubCommand(command.options)) {
		command.options?.map(x => {
			var shortCommandName = x.prefixName || x.name;
			var pathString = boldStringifyOption(x.options || []);

			var aliases = x.aliases?.map(x => `\`${x}\``).join(", ") || lang.setjoinroles_var_none;
			var use = `${cleanBotPrefix}${shortCommandName} ${pathString}`;

			embed.addFields({
				name: `${cleanBotPrefix}${shortCommandName}`,
				value: lang.hybridcommands_embed_help_fields_value
					.replace("${aliases}", aliases)
					.replace("${use}", use)
			});
		});
	} else {
		let fetchFullCommandName = interaction.client.content.find(c => c.desc === command.description);
		var CommandsPerm = await client.db.get(`${interaction.guildId}.UTILS.PERMS.${fetchFullCommandName?.cmd}`) as DatabaseStructure.UtilsPermsData[""] | undefined;

		if (typeof CommandsPerm === "number") {
			CommandsPerm = {
				users: [],
				roles: [],
				level: CommandsPerm
			};
		}
		var pathString = boldStringifyOption(command.options || []);
		let perm: DatabaseStructure.PermLevel | string | undefined | null = "";

		if (command.permission) {
			let perm_cmd = getPermissionByValue(command.permission);
			if (perm_cmd) perm = lang[perm_cmd.name];
		}

		if (CommandsPerm?.level) {
			perm = CommandsPerm.level
		}

		if (CommandsPerm?.roles && CommandsPerm?.roles.length > 0) {
			perm = CommandsPerm.roles.map(x => `<@&${x}>`).join(", ");
		}

		if (CommandsPerm?.users && CommandsPerm?.users.length > 0) {
			perm += CommandsPerm.users.map(x => `<@${x}>`).join(", ");
		}

		embed.setDescription((await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`))?.startsWith("fr-") ? command.description_localizations["fr"] : command.description)
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
				value: command.aliases?.map(x => `\`${x}\``).join(", ") || lang.setjoinroles_var_none,
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

export async function checkCommandArgs(message: Message, command: Command, args: string[], lang: LanguageData): Promise<boolean> {
	if (!command) return false;

	const botPrefix = await message.client.func.prefix.guildPrefix(message.client, message.guildId!);
	let cleanBotPrefix = botPrefix.string;

	if (botPrefix.type === "mention") {
		cleanBotPrefix = lang.hybridcommands_global_prefix_cleaned_mention;
	}

	let expectedArgs: ArgumentBrief[] = [];

	command.options?.forEach(option => {
		expectedArgs.push({
			name: option.name,
			type: getArgumentOptionTypeWithOptions(option),
			required: option.required || false,
			longString: option.type === 3 && !option.choices
		});
	});

	const minArgsCount = expectedArgs.filter(arg => arg.required).length;
	const isLastArgLongString = expectedArgs.length > 0 && expectedArgs[expectedArgs.length - 1].longString;

	if (!Array.isArray(args) || args.length < minArgsCount || (args.length === 1 && args[0] === "")) {
		const missingIndex = args.length;
		await sendErrorMessage(lang, message, cleanBotPrefix, command, expectedArgs, missingIndex);
		return false;
	}

	if (isLastArgLongString) {
		const lastArgIndex = expectedArgs.length - 1;
		if (args.length > lastArgIndex) {
			args[lastArgIndex] = args.slice(lastArgIndex).join(" ");
			args.splice(lastArgIndex + 1);
		}
	}

	for (let i = 0; i < expectedArgs.length; i++) {
		if (i >= args.length && !expectedArgs[i].required) {
			continue;
		} else if (i >= args.length && expectedArgs[i].required) {
			await sendErrorMessage(lang, message, cleanBotPrefix, command, expectedArgs, i);
			return false;
		} else if (i < args.length && !isValidArgument(args[i], expectedArgs[i].type, message.attachments)) {
			await sendErrorMessage(lang, message, cleanBotPrefix, command, expectedArgs, i);
			return false;
		}
	}

	return true;
}

function isValidArgument(arg: string, type: string, atc: Collection<string, Attachment>): boolean {
	if (type.includes("/")) {
		return type.split("/").includes(arg);
	}

	switch (type) {
		case "string":
			return typeof arg === 'string';
		case "user":
			return /^<@!?(\d+)>$/.test(arg) || !isNaN(Number(arg))
		case "roles":
			return /^<@&(\d+)>$/.test(arg) || !isNaN(Number(arg));
		case "number":
			return !isNaN(Number(arg));
		case "channel":
			return /^<#(\d+)>$/.test(arg) || !isNaN(Number(arg));
		case "default":
			return true;
		default:
			return false;
	}
}

async function sendErrorMessage(lang: LanguageData, message: Message, botPrefix: string, command: Command, expectedArgs: ArgumentBrief[], errorIndex: number) {
	let argument: string[] = [];
	let fullNameCommand: string;

	expectedArgs.forEach(arg => argument.push(arg.required ? `[${arg.type}]` : `<${arg.type}>`));

	let currentCommand: Command | Option;
	let wrongArgumentName: string = "";
	let errorPosition = "";

	fullNameCommand = command.prefixName || command.name!;
	currentCommand = command as any;

	errorPosition += " ".padStart(botPrefix.length + fullNameCommand.length);

	argument.forEach((arg, index) => {
		if (errorIndex === index) {
			wrongArgumentName = arg.slice(1, -1);
			errorPosition += " ^";
		} else {
			errorPosition += " ".padStart(arg.length + 1);
		}
	});

	let argsString = argument.join(" ");
	const embed = new EmbedBuilder()
		.setDescription(lang.hybridcommands_args_error_embed_desc
			.replace("${currentCommand.name}", currentCommand.prefixName || currentCommand.name)
			.replace("${botPrefix}", botPrefix)
			.replace("${fullNameCommand}", fullNameCommand)
			.replace("${argsString}", argsString)
			.replace("${errorPosition}", errorPosition)
			.replace("${wrongArgumentName}", wrongArgumentName)
		)
		.setColor("Red")
		.setFooter({
			iconURL: "attachment://footer_icon.png",
			text: lang.hybridcommands_embed_footer_text.replace("${botPrefix}", botPrefix)
		});

	await message.client.func.method.interactionSend(message, {
		embeds: [embed],
		files: [await message.client.func.displayBotName.footerAttachmentBuilder(message)]
	});
}

export async function interactionSend(
	interaction: ChatInputCommandInteraction<"cached"> | ChatInputCommandInteraction | Message,
	options: string | MessageReplyOptions | MessageEditOptions | InteractionReplyOptions
): Promise<Message> {
	const nonce = SnowflakeUtil.generate().toString();

	if (interaction instanceof ChatInputCommandInteraction) {
		const editOptions: InteractionReplyOptions = typeof options === 'string'
			? { content: options }
			: { ...options as InteractionReplyOptions };

		if (interaction.replied) {
			return await interaction.editReply(editOptions as InteractionEditReplyOptions);
		} else if (interaction.deferred) {
			await interaction.editReply(editOptions as InteractionEditReplyOptions);
			return await interaction.fetchReply();
		} else {
			return await interaction.reply({ ...editOptions, fetchReply: true });
		}
	} else {
		let replyOptions: MessageReplyOptions;
		if (typeof options === 'string') {
			replyOptions = {
				content: options,
				allowedMentions: { repliedUser: false }
			};
		} else {
			replyOptions = {
				...options as MessageReplyOptions,
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

export async function channelSend(interaction: Message | ChatInputCommandInteraction<"cached"> | AnySelectMenuInteraction<"cached"> | BaseGuildTextChannel, options: string | MessageReplyOptions | MessageEditOptions): Promise<Message> {
	const nonce = SnowflakeUtil.generate().toString();
	let replyOptions: MessageReplyOptions;

	if (typeof options === 'string') {
		replyOptions = { content: options, allowedMentions: { repliedUser: false } };
	} else {
		replyOptions = {
			...options,
			content: options.content ?? undefined,
			nonce: nonce,
			enforceNonce: true
		} as MessageReplyOptions;
	}

	if (interaction instanceof BaseGuildTextChannel) {
		return await interaction.send(replyOptions)!;
	} else {
		return await (interaction.channel as BaseGuildTextChannel)?.send(replyOptions)!;
	}
}

export function hasSubCommand(options: Option[] | undefined): boolean {
	if (!options) return false;
	return options.some(option => option.type === ApplicationCommandOptionType.Subcommand);
}

export function hasSubCommandGroup(options: Option[] | undefined): boolean {
	if (!options) return false;
	return options.some(option => option.type === ApplicationCommandOptionType.SubcommandGroup);
}

export function isSubCommand(option: Option | Command): boolean {
	return option.type === ApplicationCommandOptionType.Subcommand;
}

export async function punish(data: any, user: GuildMember | undefined, reason?: string) {
	async function derank() {
		let user_roles = Array.from(user?.roles.cache.values()!);
		let role_app = user_roles.find(x => x.managed);
		if (role_app) {
			await role_app.setPermissions(PermissionFlagsBits.ViewChannel);
		}

		user_roles
			.filter(x => !x.managed && x.position < x.guild.members.me?.roles.highest.position! && x.id !== x.guild.roles.everyone.id)
			.forEach(async role => {
				await user?.roles.remove(role.id, reason || "Protection").catch(() => { })
			});
	}
	switch (data?.['SANCTION']) {
		case 'simply':
			break;
		case 'simply+derank':
			await derank();
			break;
		case 'simply+ban':
			user?.ban({ reason: reason || 'Protect!' }).catch(async () => await derank().catch(() => false));
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
			}
			invitesAmount: number;
		},
		ranks?: {
			level: number;
		},
		notifier?: {
			artistAuthor: string;
			artistLink: string;
			mediaURL: string;
		}
	}
): string {
	return message
		.replaceAll("{memberUsername}", input.user.username)
		.replaceAll("{memberMention}", input.user.toString())
		.replaceAll('{memberCount}', input.guild.memberCount?.toString()!)
		.replaceAll('{createdAt}', input.user.createdAt.toLocaleDateString(input.guildLocal))
		.replaceAll('{accountCreationTimestamp}', time(input.user.createdAt, 'R'))
		.replaceAll('{guildName}', input.guild.name)
		.replaceAll('{inviterUsername}', input.inviter?.user.username || `unknow_user`)
		.replaceAll('{inviterMention}', input.inviter?.user.mention || `@unknow_user`)
		.replaceAll('{invitesCount}', input.inviter?.invitesAmount.toString() || '1337')
		.replaceAll('{xpLevel}', input.ranks?.level.toString() || "1337")
		.replaceAll("\\n", '\n')
		.replaceAll('{artistAuthor}', input.notifier?.artistAuthor || "Ninja")
		.replaceAll('{artistLink}', input.notifier?.artistLink || "https://twitch.tv/Ninja")
		.replaceAll('{mediaURL}', input.notifier?.mediaURL || "https://twitch.tv/Ninja/media");

}

export function findOptionRecursively(options: Option[], subcommandName: string): Option | undefined {
	for (const option of options) {
		if (option.name === subcommandName) {
			return option;
		}

		if (option.options && (option.type === ApplicationCommandOptionType.SubcommandGroup || option.type === ApplicationCommandOptionType.Subcommand)) {
			const foundOption = findOptionRecursively(option.options, subcommandName);
			if (foundOption) {
				return foundOption;
			}
		}
	}
	return undefined;
};

export async function buttonReact(msg: Message, button: ButtonBuilder): Promise<Message> {
	let comp = msg.components;
	let isAdd = false;

	if (comp.length >= 5) {
		throw "Too much components on this message!";
	}

	for (let lines of comp) {
		if (lines.components.length < 5 && !isAdd) {
			if (lines.components.find(x => x.type === ComponentType.Button)) {
				let newActionRow: ActionRowBuilder = ActionRowBuilder.from(lines);

				newActionRow.addComponents(button);
				comp[comp.indexOf(lines)] = newActionRow.toJSON() as ActionRow<MessageActionRowComponent>;
				isAdd = true;
				break;
			}
		}
	}

	if (!isAdd) {
		let newActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
		comp.push(newActionRow.toJSON() as ActionRow<MessageActionRowComponent>);
	}

	await msg.edit({ components: comp });

	return msg;
}

export async function buttonUnreact(msg: Message, buttonEmoji: string): Promise<Message> {
	let comp = msg.components;
	let isRemoved = false;

	const newComp = [];

	for (let i = 0; i < comp.length; i++) {
		const actionRow = comp[i];
		const newComponents = actionRow.components.filter(component => {
			if (component.type === ComponentType.Button && component.emoji?.id === buttonEmoji) {
				isRemoved = true;
				return false;
			}
			return true;
		});

		if (newComponents.length > 0) {
			newComp.push({ type: 1, components: newComponents });
		}
	}

	if (!isRemoved) return msg;

	await msg.edit({ components: newComp });
	return msg;
}

export function isAnimated(attachmentUrl: string): boolean {
	const fileName = attachmentUrl.split('/').pop() || '';
	return fileName.startsWith('a_');
}

export async function warnMember(author: GuildMember, member: GuildMember, reason: string): Promise<string> {
	let warnObject: DatabaseStructure.WarnsData = {
		timestamp: Date.now(),
		reason: reason,
		authorID: author.user.id,
		id: generatePassword({ length: 8, lowercase: false, numbers: true })
	}

	await member.client.db.push(`${member.guild.id}.USER.${member.user.id}.WARNS`, warnObject);

	return warnObject.id;
}

export function getDangerousPermissions(lang: LanguageData): {
	flag: bigint;
	name: string;
}[] {
	const dangerousPermissions = [
		{ flag: PermissionsBitField.Flags.Administrator, name: lang.setjoinroles_var_perm_admin },
		{ flag: PermissionsBitField.Flags.ManageGuild, name: lang.setjoinroles_var_perm_manage_guild },
		{ flag: PermissionsBitField.Flags.ManageRoles, name: lang.setjoinroles_var_perm_manage_role },
		{ flag: PermissionsBitField.Flags.MentionEveryone, name: lang.setjoinroles_var_perm_use_mention },
		{ flag: PermissionsBitField.Flags.BanMembers, name: lang.setjoinroles_var_perm_ban_members },
		{ flag: PermissionsBitField.Flags.KickMembers, name: lang.setjoinroles_var_perm_kick_members },
		{ flag: PermissionsBitField.Flags.ManageWebhooks, name: lang.setjoinroles_var_perm_manage_webhooks },
		{ flag: PermissionsBitField.Flags.ManageChannels, name: lang.setjoinroles_var_perm_manage_channels },
		{ flag: PermissionsBitField.Flags.ManageGuildExpressions, name: lang.setjoinroles_var_perm_manage_expression },
		{ flag: PermissionsBitField.Flags.ViewCreatorMonetizationAnalytics, name: lang.setjoinroles_var_perm_view_monetization_analytics },
	];

	return dangerousPermissions
}

export async function addCoins(member: GuildMember, coins: number): Promise<void> {
	await member.client.db.add(`${member.guild.id}.USER.${member.id}.ECONOMY.money`, coins);
}

export async function subCoins(member: GuildMember, coins: number): Promise<void> {
	await member.client.db.sub(`${member.guild.id}.USER.${member.id}.ECONOMY.money`, coins);
}

export async function isTicketChannel(channel: BaseGuildTextChannel): Promise<boolean> {
	let allTickets = await channel.client.db.get(`${channel.guild.id}.TICKET_ALL`);

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
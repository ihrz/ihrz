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
	ApplicationCommandOptionType,
	BaseGuildTextChannel,
	Client,
	EmbedBuilder,
	GuildChannel,
	GuildMember,
	Message,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";
import { LanguageData } from "../../../types/languageData.js";
import { Command } from "../../../types/command.js";
import { BotEvent } from "../../../types/event.js";
import { Option } from "../../../types/option.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { getPermissionByValue } from "../../core/functions/permissonsCalculator.js";
import { blacklistTable } from "../client/ready.js";
import { loggerX } from "../logs/slashCommandLogger.js";
import { checkCommandRateLimit } from "./slashCommandHandler.js";
import { Expressions } from "../../core/functions/randomExpression.js";
import { Routes } from "discord-api-types/v10";

type MessageCommandResponse = {
	success: boolean;
	args?: string[];
	command?: Command;
	subCommand?: Option | Command;
	commandPath?: string;
};

type DiscordEntitlement = {
	id: string;
	sku_id: string;
	guild_id?: string;
	user_id?: string;
	deleted?: boolean;
};

export async function hasGuildSku(
	client: Client,
	guildId: string,
	skuId: string
): Promise<boolean> {
	const entitlements = (await client.rest.get(
		Routes.entitlements(client.user!.id)
	)) as DiscordEntitlement[];

	return entitlements.some(
		(entitlement) =>
			entitlement.guild_id === guildId &&
			entitlement.sku_id === skuId &&
			!entitlement.deleted
	);
}

function getAllCommandChoices(client: Client): string[] {
	const choices: string[] = [];

	const getCommandChoices = (command: Command | Option, parentName = "") => {
		const commandName = parentName
			? `${parentName} ${command.name}`
			: command.name;
		choices.push(commandName);

		if (command.options) {
			command.options.forEach((option) => {
				if (
					option.type ===
						ApplicationCommandOptionType.SubcommandGroup ||
					option.type === ApplicationCommandOptionType.Subcommand
				) {
					getCommandChoices(option, commandName);
				}
			});
		}
	};

	client.commands.forEach((command: Command) => {
		getCommandChoices(command);
	});

	return choices;
}

export async function parseMessageCommand(
	client: Client,
	message: Message
): Promise<MessageCommandResponse> {
	const prefix = await client.func.prefix.guildPrefix(
		client,
		message.guildId!
	);
	if (!message.content.startsWith(prefix.string)) return { success: false };

	const args = message.content
		.slice(prefix.string.length)
		.trim()
		.split(/ +/g);
	const commandName = args.shift()?.toLowerCase();

	if (!commandName) return { success: false };

	if (message.reference && message.reference.messageId) {
		const referencedMessage =
			message.channel.messages.cache.get(message.reference.messageId) ||
			(await message.channel.messages.fetch(message.reference.messageId));
		if (referencedMessage && referencedMessage.author) {
			// We need to first check if it's a subcommand
			const potentialSubCommandName = args[0]?.toLowerCase();
			const mainCommand = client.message_commands.get(commandName);

			if (mainCommand && mainCommand.options) {
				// Check if the first arg is a subcommand
				const subCommand = mainCommand.options.find(
					(opt) =>
						(opt.name === potentialSubCommandName ||
							opt.aliases?.includes(potentialSubCommandName)) &&
						(opt.type === 1 || opt.type === 2) // sub or subgroup
				);

				if (subCommand) {
					// It's a subcommand, remove its name from args
					args.shift();

					// Now look for the User option in the subcommand
					const userOptionIndex = subCommand.options?.findIndex(
						(opt) => opt.type === ApplicationCommandOptionType.User
					);

					if (
						userOptionIndex !== undefined &&
						userOptionIndex !== -1
					) {
						args.splice(
							userOptionIndex,
							0,
							referencedMessage.author.id
						);
					}
				} else {
					// No subcommand, search in the main command
					const userOptionIndex = mainCommand.options.findIndex(
						(opt) => opt.type === ApplicationCommandOptionType.User
					);

					if (userOptionIndex !== -1) {
						args.splice(
							userOptionIndex,
							0,
							referencedMessage.author.id
						);
					}
				}
			}
		}
	}

	const directSubCommand = client.subCommands.get(commandName);
	if (directSubCommand) {
		const commandPath =
			getAllCommandChoices(client).find((choice) =>
				choice.endsWith(` ${directSubCommand.name}`)
			) || directSubCommand.name;
		const parentCommandName = commandPath.includes(" ")
			? commandPath.split(" ")[0]
			: commandPath;
		const parentCommand = client.commands.get(parentCommandName);
		return {
			success: true,
			args: args,
			command: parentCommand,
			subCommand: directSubCommand,
			commandPath
		};
	}

	const mainCommand = client.message_commands.get(commandName);
	if (mainCommand) {
		const potentialSubCommandName = args[0]?.toLowerCase();
		if (potentialSubCommandName && mainCommand.options) {
			const subCommand = mainCommand.options.find(
				(opt) =>
					(opt.name === potentialSubCommandName ||
						opt.aliases?.includes(potentialSubCommandName)) &&
					opt.type === (1 || 2) //sub or subgroup
			);
			if (subCommand) {
				args.shift();
				return {
					success: true,
					args: args,
					command: mainCommand,
					subCommand: subCommand,
					commandPath: `${mainCommand.name} ${subCommand.name}`
				};
			}
		}
		return {
			success: true,
			args: args,
			command: mainCommand,
			commandPath: mainCommand.name
		};
	}

	return { success: false };
}

async function executeCommand(
	message: Message,
	command: Command,
	args: string[],
	lang: LanguageData,
	commandPath?: string
) {
	const channel = message.channel as GuildChannel;
	const member =
		message.member ??
		(await message.guild?.members
			.fetch(message.author.id)
			.catch(() => null));
	const permissions = member ? channel.permissionsFor(member) : null;
	const canUseCommands = permissions?.has(
		PermissionsBitField.Flags.UseApplicationCommands
	);

	if (!canUseCommands || !member) return;

	if (
		client.version.env === "production" &&
		!(await client.func.ownerHelper.isBotOwner(message.author.id)) &&
		command.description.startsWith("Change the iHorizon") &&
		!(await hasGuildSku(client, message.guild!.id, "1512856902919258384"))
	) {
		return await client.func.method.interactionSend(message, {
			content: `${client.iHorizon_Emojis.Boost_Gem} https://discord.com/discovery/applications/945202900907470899/store`,
			embeds: [
				new EmbedBuilder()
					.setThumbnail(Expressions.Pleading)
					.setColor("Red")
					.setTitle(lang.custom_sdk_only_title)
					.setDescription(lang.custom_sdk_only_description)
			]
		});
	}

	const fetchFullCommandName = message.client.content.find(
		(c) => c.desc === command.description
	);

	const permCheck =
		await message.client.func.permissonsCalculator.checkCommandPermission(
			message,
			fetchFullCommandName?.cmd!
		);
	if (
		!permCheck.allowed &&
		message.client.func.permissonsCalculator.hasCommandPermissionRequirements(
			permCheck.permissionData
		)
	) {
		return message.client.func.permissonsCalculator.sendErrorMessage(
			message,
			lang,
			permCheck.permissionData
		);
	}

	const isRateLimited = await checkCommandRateLimit(
		message,
		fetchFullCommandName?.cmd!,
		lang
	);
	if (isRateLimited) return;

	// for format like: "+utils" without subcommand behind
	if (!command?.run) {
		const msg = await message.client.func.method.interactionSend(message, {
			embeds: [
				await message.client.func.method.createAwesomeEmbed(
					lang,
					command,
					message.client,
					message
				)
			],
			files: [
				await message.client.func.displayBotName.footerAttachmentBuilder(
					message
				)
			]
		});

		setTimeout(() => {
			msg.delete();
		}, 60_000);
		return;
	}

	if (
		command.permission &&
		!member.permissions.has(command.permission) &&
		!permCheck.allowed
	) {
		const perm = getPermissionByValue(command.permission);

		if (perm) {
			let permName: string;
			if (Array.isArray(perm)) {
				// If it's an array of permissions, join their names
				permName = perm
					.filter((p): p is NonNullable<typeof p> => p !== null)
					.map((p) => lang[p.name] || p.name)
					.join(", ");
			} else {
				// Single permission case
				permName = lang[perm.name] || perm.name;
			}
			return await message.reply({
				content: lang.var_dont_have_perm.replace("{perm}", permName)
			});
		}
	}

	const _ = await message.client.func.method.checkCommandArgs(
		message,
		command,
		Array.from(args),
		lang
	);
	if (!_) return;

	(async () => {
		try {
			await command.run!(message.client, message, lang, args);
		} catch (error) {
			await handleCommandError(message, command, error);
		}
	})();
}

async function handleCommandError(
	message: Message,
	command: Command | Option,
	error: any
) {
	const errorBlock = `\`\`\`TS\nMessage: The command ran into a problem!\nCommand Name: ${command.name}\nError: ${error}\`\`\`\n`;
	const channel = message.client.channels.cache.get(
		message.client.config.core.reportChannelID
	) as BaseGuildTextChannel;

	if (channel) {
		await channel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle("MSG_CMD_CRASH_NOT_HANDLE")
					.setDescription(errorBlock)
					.setTimestamp()
					.setFields(
						{
							name: "🛡️ Bot Admin",
							value: message.guild?.members.me?.permissions.has(
								PermissionFlagsBits.Administrator
							)
								? "yes"
								: "no"
						},
						{
							name: "📝 User Admin",
							value: (
								message.member as GuildMember
							)?.permissions.has(
								PermissionFlagsBits.Administrator
							)
								? "yes"
								: "no"
						},
						{
							name: "** **",
							value: message.content
						}
					)
			]
		});
	}
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (!message.guild || message.author.bot || !message.channel) return;

		if (
			await client.func.helper.cooldown(
				message.author.id,
				"msg_commands",
				1000
			)
		) {
			return;
		}

		const result = await parseMessageCommand(client, message);
		if (!result.success) return;
		if (await blacklistTable.get(`${message.author.id}.blacklisted`)) {
			return;
		}

		try {
			const lang = await client.func.getLanguageData(message.guildId);

			loggerX.addCommand({
				channelName: (message.channel as BaseGuildTextChannel).name,
				command: message.content.trim(),
				executorUsername: message.author.username,
				guildName: message.guild.name,
				guildId: message.guildId!,
				timestamp: Date.now(),
				channelId: message.channelId
			});

			if (result.subCommand) {
				await executeCommand(
					message,
					result.subCommand as Command,
					result.args || [],
					lang,
					result.commandPath
				);
			} else if (result.command) {
				await executeCommand(
					message,
					result.command,
					result.args || [],
					lang,
					result.commandPath
				);
			}
		} catch (error) {
			console.error(error);
			await handleCommandError(
				message,
				result.subCommand || result.command!,
				error
			);
		}
	}
};

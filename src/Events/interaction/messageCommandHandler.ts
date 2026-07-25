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
	Client,
	GuildChannel,
	Message,
	PermissionsBitField
} from "discord.js";
import { Command } from "../../../types/command.js";
import { BotEvent } from "../../../types/event.js";
import { blacklistTable } from "../client/ready.js";
import { loggerX } from "../logs/slashCommandLogger.js";
import { preExecutionCooldown, runCommand } from "../../core/commandExecutor.js"

type MessageCommandResponse = {
	success: boolean;
	args?: string[];
	command?: Command;
	subCommand?: Command;
	commandPath?: string;
};

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
					if (userOptionIndex !== undefined && userOptionIndex !== -1) {
						args.splice(userOptionIndex, 0, referencedMessage.author.id);
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

	const directMessageCommand = client.message_commands.get(commandName);
	if (directMessageCommand?.commandFullName?.includes(" ")) {
		const commandPath = directMessageCommand.commandFullName;
		const parentCommand = client.commands.get(commandPath.split(" ")[0]);
		return {
			success: true,
			args,
			command: parentCommand,
			subCommand: directMessageCommand,
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
					(opt.type === ApplicationCommandOptionType.Subcommand ||
						opt.type === ApplicationCommandOptionType.SubcommandGroup)
			);
			if (subCommand?.commandFullName) {
				args.shift();
				return {
					success: true,
					args,
					command: mainCommand,
					subCommand: subCommand as unknown as Command,
					commandPath: subCommand.commandFullName
				};
			}
		}
		return {
			success: true,
			args,
			command: mainCommand,
			commandPath: mainCommand.commandFullName ?? mainCommand.name
		};
	}

	return { success: false };
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (!message.guild || message.author.bot || !message.channel) return;
		if (await preExecutionCooldown(client, message)) return;

		const result = await parseMessageCommand(client, message);
		if (!result.success || !result.command) return;
		if (await blacklistTable.get(`${message.author.id}.blacklisted`)) return;

		const channel = message.channel as GuildChannel;
		const member =
			message.member ??
			(await message.guild?.members.fetch(message.author.id).catch(() => null));
		const canUseCommands = member
			? channel.permissionsFor(member)?.has(PermissionsBitField.Flags.UseApplicationCommands)
			: false;
		if (!canUseCommands || !member) return;

		const lang = await client.func.getLanguageData(message.guildId);

		loggerX.addCommand({
			channelName: (message.channel as any).name,
			command: message.content.trim(),
			executorUsername: message.author.username,
			guildName: message.guild.name,
			guildId: message.guildId!,
			timestamp: Date.now(),
			channelId: message.channelId
		});

		await runCommand({
			client,
			source: message,
			lang,
			command: result.command,
			target: result.subCommand ?? result.command,
			args: result.args ?? [],
			commandPath: result.commandPath ?? result.command.name
		});
	}
};
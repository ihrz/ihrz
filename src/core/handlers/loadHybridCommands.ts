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

import { ApplicationCommandOptionType, Client } from "discord.js";

import {
	isCommandEntry,
	resolveCategoryInitializer,
	subCommandKey
} from "../handlerHelper.js";
import { Command, SubCommandModule } from "../../../types/command.js";
import { Option } from "../../../types/option.js";

import * as argsHelper from "../functions/method.js";
import logger from "../logger.js";
import { ExportedFiles } from "../modules/exportsManifest.js";

async function processOptions(
	options: Option[],
	category: string,
	parentName: string = "",
	client: Client
) {
	for (const option of options) {
		const fullName = parentName
			? `${parentName} ${option.name}`
			: option.name;
		const fullNameForPrefix = option.prefixName || option.name;

		if (option.type === ApplicationCommandOptionType.Subcommand) {
			client.content.push({
				cmd: fullName,
				prefixCmd: fullNameForPrefix,
				messageCmd: 2,
				category: category,
				desc: option.description,
				usage: argsHelper.stringifyOption(option.options || []),
				desc_localized: option.description_localizations
			});
		}
		if (option.options) {
			await processOptions(option.options, category, fullName, client);
		}
	}
}

export default async function loadCommands(client: Client): Promise<void> {
	const { default: files } = await import("../../exports/hybridCommands.ts");

	let i = 0;
	for (const [path, module] of Object.entries(files as ExportedFiles)) {
		if (!isCommandEntry(path)) continue;

		if (!module) continue;

		if (module && module.command) {
			const command: Command = module.command;
			i++;

			if (command.options) {
				await processCommand(command, path, client, files);
			}

			if (client.message_commands.has(command.name)) {
				logger.err(
					`Command "${command.name}" already exists! Exiting...`.bgRed
				);
				process.exit(1);
			}

			if (!argsHelper.hasSubCommand(command.options)) {
				client.content.push({
					cmd: command.name,
					desc: command.description,
					desc_localized: command.description_localizations,
					category: command.category,
					usage: argsHelper.stringifyOption(command.options || []),
					messageCmd: 2
				});
			}

			command.commandFullName = command.name;
			client.commands.set(command.name, command);
			client.message_commands.set(command.name, command);

			if (command.aliases) {
				for (const alias of command.aliases) {
					if (client.message_commands.has(alias)) {
						logger.err(
							`Alias "${alias}" for command "${command.name}" already exists! Exiting...`
								.bgRed
						);
						process.exit(1);
					}
					client.message_commands.set(alias, command);
				}
			}
		} else if (module?.default?.categoryInitializer) {
			client.category.push(
				resolveCategoryInitializer(module.default.categoryInitializer)
			);
		}
	}

	logger.log(
		`${client.config.console.emojis.OK} >> Loaded ${i} Hybrid commands.`
	);
}

function loadSubCommandModule(
	files: ExportedFiles,
	commandFile: string,
	commandName: string
): SubCommandModule | null {
	const module = files[subCommandKey(commandFile, commandName)] as
		SubCommandModule | undefined;

	if (!module) {
		logger.err(`Failed to load subcommand module: ${commandName}`);
		return null;
	}

	return module;
}

async function processCommandOptions(
	options: Option[],
	category: string,
	parentName: string = "",
	client: Client,
	files: ExportedFiles,
	commandFile: string
): Promise<void> {
	for (const option of options) {
		const fullName = parentName
			? `${parentName} ${option.name}`
			: option.name;
		option.commandFullName = fullName;

		if (
			option.type === ApplicationCommandOptionType.SubcommandGroup &&
			option.options
		) {
			if (!parentName) {
				logger.log(
					`Skipping subcommand group at root level: ${option.name}`
				);
				continue;
			}

			for (const subOption of option.options) {
				if (argsHelper.isSubCommand(subOption) && subOption.name) {
					const fullSubCommandName = `${fullName} ${subOption.name}`;

					const commandModule = loadSubCommandModule(
						files,
						commandFile,
						subOption.name
					);
					if (commandModule) {
						if (client.subCommands.has(fullSubCommandName)) {
							logger.err(
								`Duplicate subcommand detected: ${fullSubCommandName}`
							);
							continue; // Skip instead of exiting
						}

						(subOption as unknown as Command).run =
							commandModule.subCommand.run;

						const aliases = subOption.aliases || [];
						for (const alias of aliases) {
							if (client.message_commands.has(alias)) {
								logger.err(
									`Alias "${alias}" for command "${subOption.name}" already exists! Exiting...`
										.bgRed
								);
								process.exit(1);
							}
							client.message_commands.set(
								alias,
								subOption as unknown as Command
							);
						}
						client.subCommands.set(
							fullSubCommandName,
							subOption as unknown as Command
						);
						client.message_commands.set(
							subOption.prefixName || subOption.name,
							subOption as unknown as Command
						);
					}
				}
			}
		}

		if (option.type === ApplicationCommandOptionType.Subcommand) {
			if (!parentName) {
				continue;
			}

			const commandModule = loadSubCommandModule(
				files,
				commandFile,
				option.name
			);
			if (commandModule) {
				if (client.subCommands.has(fullName)) {
					continue;
				}

				(option as any).run = commandModule.subCommand.run;
				client.subCommands.set(fullName, option as any);

				const aliases = option.aliases || [];
				for (const alias of aliases) {
					if (client.message_commands.has(alias)) {
						logger.err(
							`Alias "${alias}" for command "${option.name}" already exists! Exiting...`
								.bgRed
						);
						process.exit(1);
					}
					client.message_commands.set(alias, option as any);
				}
				client.subCommands.set(fullName, option as any);
				client.message_commands.set(
					option.prefixName || option.name,
					option as any
				);
			}
		}

		if (
			option.options &&
			(parentName ||
				option.type === ApplicationCommandOptionType.SubcommandGroup)
		) {
			await processCommandOptions(
				option.options,
				category,
				fullName,
				client,
				files,
				commandFile
			);
		}
	}
}

export async function processCommand(
	command: Command,
	commandFile: string,
	client: Client,
	files: ExportedFiles
): Promise<void> {
	if (!command.options) return;

	await processOptions(
		command.options,
		command.category,
		command.name,
		client
	);

	if (
		argsHelper.hasSubCommand(command.options) ||
		argsHelper.hasSubCommandGroup(command.options)
	) {
		await processCommandOptions(
			command.options,
			command.category,
			command.name,
			client,
			files,
			commandFile
		);
	}
}

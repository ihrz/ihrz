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

		if (option.type === ApplicationCommandOptionType.Subcommand) {
			client.content.push({
				cmd: fullName,
				messageCmd: 0,
				category: category,
				desc: option.description,
				usage: null,
				desc_localized: option.description_localizations
			});
		}
		if (option.options) {
			await processOptions(option.options, category, fullName, client);
		}
	}
}

export default async function loadCommands(client: Client): Promise<void> {
	const { default: files } = await import("../../exports/slashCommands.ts");

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

			if (client.commands.has(command.name)) {
				logger.err(
					`Command "${command.name}" already exists! Exiting...`.bgRed
				);
				process.exit(1);
			}

			client.content.push({
				cmd: command.name,
				desc: command.description,
				category: command.category,
				messageCmd: 0,
				usage: null,
				desc_localized: command.description_localizations
			});

			client.commands.set(command.name, command);
		} else if (module?.default?.categoryInitializer) {
			client.category.push(
				resolveCategoryInitializer(module.default.categoryInitializer)
			);
		}
	}

	logger.log(
		`${client.config.console.emojis.OK} >> Loaded ${i} Slash commands.`
	);
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

		if (
			option.type === ApplicationCommandOptionType.SubcommandGroup &&
			option.options
		) {
			await Promise.all(
				option.options.map(async (subOption) => {
					if (argsHelper.isSubCommand(subOption) && subOption.name) {
						const commandModule = loadSubCommandModule(
							files,
							commandFile,
							subOption.name
						);
						if (commandModule) {
							const fullSubCommandName = `${option.name} ${subOption.name}`;

							if (client.subCommands.has(fullSubCommandName)) {
								logger.err(
									`Subcommand "${fullSubCommandName}" already exists! Exiting...`
										.bgRed
								);
								process.exit(1);
							}

							(subOption as any).run =
								commandModule.subCommand.run;
							client.subCommands.set(
								fullSubCommandName,
								subOption as any
							);
						}
					}
				})
			);
		}

		if (option.type === ApplicationCommandOptionType.Subcommand) {
			if (option.name) {
				const commandModule = loadSubCommandModule(
					files,
					commandFile,
					option.name
				);
				if (commandModule) {
					if (client.subCommands.has(option.name)) {
						logger.err(
							`Subcommand "${option.name}" already exists! Exiting...`
								.bgRed
						);
						process.exit(1);
					}

					(option as any).run = commandModule.subCommand.run;
					client.subCommands.set(fullName, option as any);
				}
			}
		}

		if (option.options) {
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

async function processCommand(
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

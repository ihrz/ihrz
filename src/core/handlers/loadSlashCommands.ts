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

import { ApplicationCommandOptionType, Client, Collection } from 'discord.js';

import { buildDirectoryTree, buildPaths } from '../handlerHelper.js';
import { Command, SubCommand, SubCommandModule } from "../../../types/command.js";
import { Option } from "../../../types/option.js";
import { fileURLToPath } from 'url';

import * as argsHelper from '../functions/method.js';
import logger from "../logger.js";
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processOptions(options: Option[], category: string, parentName: string = "", client: Client) {
	for (let option of options) {
		let fullName = parentName ? `${parentName} ${option.name}` : option.name;

		if (option.type === ApplicationCommandOptionType.Subcommand) {

			client.content.push(
				{
					cmd: fullName,
					messageCmd: 0,
					category: category,
					desc: option.description,
					usage: null,
					desc_localized: option.description_localizations
				}
			)

		};
		if (option.options) {
			await processOptions(option.options, category, fullName, client);
		};
	};
};

let p = path.join(__dirname, '..', '..', 'Interaction', 'SlashCommands');

export default async function loadCommands(client: Client, path: string = p): Promise<void> {

	let directoryTree = await buildDirectoryTree(path);
	let paths = buildPaths(path, directoryTree);

	var i = 0;
	for (let path of paths) {
		if (!path.endsWith('.js') && !path.endsWith('.json')) continue;

		let module;
		if (path.endsWith('.js')) {
			module = await import(path);
		} else if (path.endsWith('init.json')) {
			module = await import(path, { with: { "type": "json" } })
		}

		if (!module) continue;

		if (module && module.command) {
			const command: Command = module.command
			i++;

			if (command.options) {
				await processCommand(command, path, client);
			}

			if (client.commands.has(command.name)) {
				logger.err(`Command "${command.name}" already exists! Exiting...`.bgRed);
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
			client.category.push(module.default.categoryInitializer);
		};
	};

	logger.log(`${client.config.console.emojis.OK} >> Loaded ${i} Slash commands.`);
};

async function processCommandOptions(
	options: Option[],
	category: string,
	parentName: string = "",
	client: Client,
	directoryPath: string
): Promise<void> {
	for (const option of options) {
		const fullName = parentName ? `${parentName} ${option.name}` : option.name;

		if (option.type === ApplicationCommandOptionType.SubcommandGroup && option.options) {
			await Promise.all(option.options.map(async (subOption) => {
				if (argsHelper.isSubCommand(subOption) && subOption.name) {
					const commandModule = await loadSubCommandModule(directoryPath, subOption.name);
					if (commandModule) {
						const fullSubCommandName = `${option.name} ${subOption.name}`;

						if (client.subCommands.has(fullSubCommandName)) {
							logger.err(`Subcommand "${fullSubCommandName}" already exists! Exiting...`.bgRed);
							process.exit(1);
						}

						(subOption as any).run = commandModule.subCommand.run;
						client.subCommands.set(fullSubCommandName, subOption as any);
					}
				}
			}));
		}

		if (option.type === ApplicationCommandOptionType.Subcommand) {
			if (option.name) {
				const commandModule = await loadSubCommandModule(directoryPath, option.name);
				if (commandModule) {
					if (client.subCommands.has(option.name)) {
						logger.err(`Subcommand "${option.name}" already exists! Exiting...`.bgRed);
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
				directoryPath
			);
		}
	}
}

async function loadSubCommandModule(directoryPath: string, commandName: string): Promise<SubCommandModule | null> {
	try {
		return await import(`${directoryPath}/!${commandName}.js`) as SubCommandModule;
	} catch (error) {
		logger.err(`Failed to load subcommand module: ${commandName}`);
		return null;
	}
}

async function processCommand(
	command: Command,
	path: string,
	client: Client
): Promise<void> {
	if (!command.options) return;

	await processOptions(command.options, command.category, command.name, client);

	if (argsHelper.hasSubCommand(command.options) || argsHelper.hasSubCommandGroup(command.options)) {
		const directoryPath = path.substring(0, path.lastIndexOf('/'));
		await processCommandOptions(
			command.options,
			command.category,
			command.name,
			client,
			directoryPath
		);
	}
}
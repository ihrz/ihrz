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

import { Client } from "discord.js";
import { FunctionModule } from "./core/handlers/loadAnotherStuff.js";
import { Client_Functions } from "../types/client_functions.js";
import { BotEvent } from "../types/event.js";
import { CommandModule } from "./core/handlers/loadMessageCommands.js";
import { stringifyOption } from "./core/functions/method.js";
import logger from "./core/logger.js";
import { Command } from "../types/command.js";

export async function load_cache(client: Client) {
	// Load buttons
	let buttons = Object.entries(global.cache.components_button)
	for (const [name, button] of buttons) {
		const buttonName = (name.replace("_component_button_", "")
			.slice(0, -1));
		client.buttons.set(buttonName, button)
	}

	// Load functions
	let functions = Object.entries(global.cache.core_functions);
	for (const [name, moduleObj] of functions) {
		const functionName = (name.replace("_core_function_", "")
			.slice(0, -1)) as keyof typeof Client_Functions
		(client.func as FunctionModule)[functionName] = moduleObj.default || moduleObj;
	}

	// Load select menus
	let selectMenus = Object.entries(global.cache.components_select_menu)
	for (const [name, selectMenu] of selectMenus) {
		const selectMenuName = (name.replace("_component_select_menu_", "")
			.slice(0, -1));
		client.selectmenu.set(selectMenuName, selectMenu)
	}


	// Load Application Commands
	let MessageApplicationCommands = Object.entries(global.cache.MessageApplicationCommands)
	for (const [name, command] of MessageApplicationCommands) {
		const commandName = (name.replace("_message_app_", "")
			.slice(0, -1));
		client.applicationsCommands.set(commandName, command.command)
	}

	// Load User Application Commands
	let UserApplicationCommands = Object.entries(global.cache.UserApplicationCommands)
	for (const [name, command] of UserApplicationCommands) {
		const commandName = (name.replace("_user_app_", "")
			.slice(0, -1));
		client.applicationsCommands.set(commandName, command.command)
	}

	// Load Bash Commands
	let bashCommands = Object.entries(global.cache.bash)
	for (const [name, command] of bashCommands) {
		const commandName = (name.replace("bash_", "")
			.slice(0, -1));
		client.bash.set(commandName, command)
	}
	logger.log(`${client.config.console.emojis.OK} >> Loaded ${bashCommands.length} bash commands.`);

	// Load Events
	let events = Object.entries(global.cache.events)
	for (const [name, event] of events) {
		client.on(event.event.name, (event.event as BotEvent).run.bind(null, client))
	}
	logger.log(`${client.config.console.emojis.OK} >> Loaded ${events.length} events.`);


	// Load HTML files
	client.htmlfiles = global.cache.html_files

	// Load Message Commands
	let messageCommands = Object.values(global.cache.MessageCommands)
	for (const commandModule of messageCommands) {
		const command = commandModule as CommandModule;

		client.content.push(
			{
				cmd: command.command.name,
				desc: command.command.description,
				desc_localized: command.command.description_localizations,
				category: command.command.category,
				messageCmd: 1,
				usage: stringifyOption(command.command.options || []),
				aliases: command.command.aliases
			}
		);

		client.message_commands.set(command.command.name, command.command);
		if (!command.command?.aliases) continue;

		for (let aliases of command.command.aliases) {
			client.message_commands.set(aliases, command.command);
		}
	}

	logger.log(`${client.config.console.emojis.OK} >> Loaded ${messageCommands.length} Message commands.`);


	// Load Slash Commands
	let slashCommands = Object.values(global.cache.slash)

	let slashs = 0;
	let hybrids = 0;

	for await (const module of slashCommands) {
		if (!module) continue;

		if (module?.default?.categoryInitializer) {
			client.category.push(module.default.categoryInitializer);
		} else if (module?.command) {
			const command: Command = module.command;
			slashs++;

			client.commands.set(command.name, command);

			client.content.push({
				cmd: command.name,
				desc: command.description,
				category: command.category,
				messageCmd: 0,
				usage: null,
				desc_localized: command.description_localizations
			});
		}
	}
	global.cache.initializeSubCommands(client);
	logger.log(`${client.config.console.emojis.OK} >> Loaded ${slashs} Slash commands.`);

	// Load Hybrid Commands
	let hybridCommands = Object.values(global.cache.hybrid)
	for await (const module of hybridCommands) {
		if (!module) continue;
		if (module?.default?.categoryInitializer) {
			client.category.push(module.default.categoryInitializer);
		} else if (module?.command) {
			const command: Command = module.command;
			hybrids++;
			client.commands.set(command.name, command);
			client.content.push({
				cmd: command.name,
				desc: command.description,
				category: command.category,
				messageCmd: 2,
				usage: null,
				desc_localized: command.description_localizations
			});
		}
	}
	global.cache.initializeHybridCommands(client);
	logger.log(`${client.config.console.emojis.OK} >> Loaded ${hybrids} Hybrid commands.`);

}
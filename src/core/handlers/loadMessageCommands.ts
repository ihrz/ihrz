/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client } from 'discord.js';
import { opendir } from "fs/promises";
import { join as pathJoin } from "node:path";
import logger from "../logger.js";
import { Command } from "../../../types/command.js";
import { EltType } from "../../../types/eltType.js";

import { fileURLToPath } from 'url';
import path from 'path';
import { stringifyOption } from '../functions/method.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CommandModule {
	command: Command;
}

async function buildDirectoryTree(path: string): Promise<(string | object)[]> {
	const result = [];
	const dir = await opendir(path);
	for await (const dirent of dir) {
		if (!dirent.name.startsWith('!')) {
			if (dirent.isDirectory()) {
				result.push({ name: dirent.name, sub: await buildDirectoryTree(pathJoin(path, dirent.name)) });
			} else {
				result.push(dirent.name);
			}
		}
	}
	return result;
};

function buildPaths(basePath: string, directoryTree: (string | object)[]): string[] {
	const paths = [];
	for (const elt of directoryTree) {
		switch (typeof elt) {
			case "object":
				for (const subElt of buildPaths((elt as EltType).name, (elt as EltType).sub)) {
					paths.push(pathJoin(basePath, subElt));
				}
				break;
			case "string":
				paths.push(pathJoin(basePath, elt));
				break;
			default:
				throw new Error('Invalid element type');
		}
	}
	return paths;
};

const p = path.join(__dirname, '..', '..', 'Interaction', 'MessageCommands');

async function loadCommands(client: Client, path: string = p): Promise<void> {

	const directoryTree = await buildDirectoryTree(path);
	const paths = buildPaths(path, directoryTree);

	let i = 0;
	for (const path of paths) {
		if (!path.endsWith('.ts')) continue;
		i++;

		const { command } = await import(path) as CommandModule; if (!command) continue;

		client.content.push(
			{
				cmd: command.name,
				desc: command.description,
				desc_localized: command.description_localizations,
				category: command.category,
				messageCmd: 1,
				usage: stringifyOption(command.options || []),
				aliases: command.aliases
			}
		);

		client.message_commands.set(command.name, command); if (!command?.aliases) continue;

		for (const aliases of command.aliases) {
			client.message_commands.set(aliases, command);
		}
	};

	logger.log(`${client.config.console.emojis.OK} >> Loaded ${i} Message commands.`);
};

export default loadCommands;
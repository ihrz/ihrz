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

import { Client, Collection } from 'discord.js';

import { fileURLToPath } from 'url';
import path from 'path';
import { readdir } from 'node:fs/promises';
import { Client_Functions } from '../../../types/client_functions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type FunctionModule = {
	[K in keyof typeof Client_Functions]: typeof Client_Functions[K]
};

export default async (client: Client) => {

	(await readdir(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'Buttons')))
		.filter(file => file.endsWith(".js"))
		.forEach(async file => {
			const buttons = await import(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'Buttons', file));
			client.buttons.set(file.split('.js')[0], buttons.default || buttons);
		});

	const functionsDir = path.join(__dirname, '..', '..', 'core', 'functions');
	const functionFiles = (await readdir(functionsDir)).filter(file => file.endsWith(".js"));

	for (const file of functionFiles) {
		const functionName = file.split('.js')[0] as keyof typeof Client_Functions;
		const functionModule = await import(path.join(functionsDir, file));
		const functionImplementation = functionModule.default || functionModule;

		(client.func as FunctionModule)[functionName] = functionImplementation;
	}

	(await readdir(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'SelectMenu')))
		.filter(file => file.endsWith(".js"))
		.forEach(async file => {
			const selectmenu = await import(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'SelectMenu', file));
			client.selectmenu.set(file.split('.js')[0], selectmenu.default || selectmenu);
		});
};
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

import { Client } from "discord.js";

import { Client_Functions } from "../../../types/client_functions.js";
import { ExportedFiles } from "../modules/exportsManifest.js";

export type FunctionModule = {
	[K in keyof typeof Client_Functions]: (typeof Client_Functions)[K];
};

// Export keys are file names: "name.ts" registers as "name".
const baseName = (file: string) => file.slice(0, -".ts".length);

export default async (client: Client) => {
	const { default: buttons } = await import("../../exports/buttons.ts");

	for (const [file, module] of Object.entries(buttons as ExportedFiles)) {
		client.buttons.set(baseName(file), module.default || module);
	}

	const { default: functions } = await import("../../exports/functions.ts");

	for (const [file, module] of Object.entries(functions as ExportedFiles)) {
		const functionName = baseName(file) as keyof typeof Client_Functions;

		(client.func as FunctionModule)[functionName] =
			module.default || module;
	}

	const { default: selectMenus } =
		await import("../../exports/selectMenus.ts");

	for (const [file, module] of Object.entries(selectMenus as ExportedFiles)) {
		client.selectmenu.set(baseName(file), module.default || module);
	}
};

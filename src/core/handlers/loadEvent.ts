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

import { Client, ClientEvents, RestEvents } from "discord.js";

import logger from "../logger.js";

import { BotEvent } from "../../../types/event.js";
import { ExportedFiles } from "../modules/exportsManifest.js";

const loadedEvents = new Set<string>();

async function loadEvents(client: Client): Promise<void> {
	const { default: files } = await import("../../exports/events.ts");
	const entries = Object.entries(files as ExportedFiles);

	for (const [filePath, imported] of entries) {
		if (loadedEvents.has(filePath)) {
			logger.warn(`Event ${filePath} already loaded. Skipping.`);
			continue;
		}
		loadedEvents.add(filePath);

		if (imported.event) {
			client.on(
				(imported.event as BotEvent).name as keyof ClientEvents,
				(imported.event as BotEvent).run.bind(null, client) as (
					...args: any[]
				) => Promise<any>
			);
		} else if (imported.restEvent) {
			client.rest.on(
				(imported.restEvent as BotEvent).name as keyof RestEvents,
				(imported.restEvent as BotEvent).run.bind(null, client) as (
					...args: any[]
				) => Promise<any>
			);
		}
	}

	logger.log(
		`${client.config.console.emojis.OK} >> Loaded ${entries.length} events.`
	);
}

export default loadEvents;

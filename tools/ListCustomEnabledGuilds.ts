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

import { readFile } from "fs/promises";
import path from "path";
import logger from "../src/core/logger.js";

interface SlashLogEntry {
	channelName: string;
	command: string;
	executorUsername: string;
	guildName: string;
	guildId: string;
	timestamp: number;
	channelId: string;
}

async function main() {
	const slashLogsPath = path.join(process.cwd(), "src", "files", "slash.log.json");
	const outputPath = path.join(
		process.cwd(),
		"src",
		"files",
		"custom-enabled-guilds.json"
	);

	const raw = await readFile(slashLogsPath, "utf-8");
	const entries = JSON.parse(raw) as SlashLogEntry[];

	const customEntries = entries.filter((entry) => {
		const command = entry.command.trim().toLowerCase();
		return command === "/custom" || command.startsWith("/custom ");
	});

	const guilds = Array.from(
		new Map(
			customEntries
				.filter((entry) => entry.guildId)
				.map((entry) => [
					entry.guildId,
					{
						guildId: entry.guildId,
						guildName: entry.guildName,
						lastUsedAt: entry.timestamp,
						uses: customEntries.filter(
							(customEntry) => customEntry.guildId === entry.guildId
						).length
					}
				])
		).values()
	).sort((a, b) => b.lastUsedAt - a.lastUsedAt);

	await Bun.write(outputPath, JSON.stringify(guilds, null, 2));

	logger.log(`Found ${guilds.length} guilds with /custom usage.`);
	for (const guild of guilds) {
		logger.legacy(
			`${guild.guildId} | ${guild.guildName} | uses=${guild.uses} | lastUsedAt=${guild.lastUsedAt}`
		);
	}

	logger.log(`Saved result to ${outputPath}`);
}

main().catch((error) => {
	logger.err(error);
	process.exit(1);
});

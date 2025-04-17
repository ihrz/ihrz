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
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import logger from '../logger.ts';

class EmojisManager {
	private client: Client;
	private emojisPath = path.join(process.cwd(), "src", "assets", "emojis");
	private final_appEmojis: Record<string, string> = {};

	constructor(client: Client) {
		this.client = client;
	}

	public async startSync() {
		let appEmojis = await this.fetchCurrentApplicationEmojis();
		let local_emojis = this.loadLocalEmojis();

		let result = {
			skiped: 0,
			writed: 0,
			cant: 0
		}

		for (let local_emoji of local_emojis) {
			// Check if the local emoji exist on the Application Emoji
			let appEmoji = appEmojis.find(x => x.Name === local_emoji.Name);
			if (appEmoji) {
				this.final_appEmojis[local_emoji.Name.replace("iHorizon_", "")] = appEmoji.FormatedName;
				result.skiped++;
			} else {
				try {
					let res = await this.client.application?.emojis.create({
						name: local_emoji.Name,
						attachment: readFileSync(path.join(this.emojisPath, `${local_emoji.Name}.${local_emoji.Extension}`))
					});

					this.final_appEmojis[local_emoji.Name.replace("iHorizon_", "")] = res!.toString();

					result.writed++;
				} catch {
					result.cant++;
				}
			}
		}

		logger.log(`${this.client.config.console.emojis.OK} >> ${result.skiped} emojis skiped, ${result.writed} emojis created.`);
		(result.cant >= 1) ? logger.warn(`I got issue with ${result.cant} emoji(s)!`) : null;
		this.writeInClient();
		this.writeFinalJSON();
	}

	private loadLocalEmojis() {
		let local_emojis = readdirSync(this.emojisPath);
		let emojis = [];

		for (let emoji of local_emojis) {
			emojis.push({
				Name: `${emoji.split(".")[0]}`,
				Extension: emoji.endsWith("png") ? "png" : "gif",
			})
		}

		return emojis;
	}

	private async fetchCurrentApplicationEmojis() {
		var fetched_emojis_data = await this.client.application?.emojis.fetch();
		var filtered_emojis_data = fetched_emojis_data?.values().toArray()
			.map(x => {
				return {
					Name: x.name,
					Extension: x.animated ? "gif" : "png",
					Id: x.id,
					FormatedName: x.toString()
				}
			})
			.filter(x => x.Name?.startsWith("iHorizon"));
		return filtered_emojis_data || [];
	}

	private writeFinalJSON() {
		writeFileSync(path.join(
			process.cwd(),
			"src",
			"files",
			"emojis.json"
		), JSON.stringify(this.final_appEmojis, null, 4));
	}

	private writeInClient() {
		this.client.iHorizon_Emojis = this.final_appEmojis as any;
	}
}

export {
	EmojisManager
};
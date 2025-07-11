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

import { Client, Guild } from "discord.js"
import { DatabaseStructure } from "../../../types/database_structure";

type nightModeData = { guildId: string, data: DatabaseStructure.NightMode | undefined }[];

class NightModeManager {
	client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	public async init() {
		this.Refresh(await this.GetNightModeData());
		setInterval(async () => {
			this.Refresh(await this.GetNightModeData())
		}, 60_000 * 5)
	}

	private async GetNightModeData(): Promise<nightModeData> {
		const all = await this.client.db.all();
		return all
			.filter(v => Number(v.id))
			.map(v => {
				const guildObject = v.value as DatabaseStructure.DbInId;
				return { guildId: v.id, data: guildObject.UTILS?.NIGHT_MODE };
			})
			.filter(v => v.data);
	}

	private async Refresh(nightModeData: nightModeData) {
		for (const guildObject of nightModeData) {
			try {
				const guild = this.client.guilds.cache.get(guildObject.guildId);
				if (!guild) continue;

				console.log(guildObject)
				/*
				{
				  guildId: "999449972615413861",
				  data: {
					enabled: true,
					notify: false,
					time: [ 22, 8 ],
				  },
				}
				*/
			} catch (err) {

			}
		}
	}

	private async calculate_window_time() {

	}

	private async Add_All_PA(guild: Guild) {

	}

	private async Remove_All_PA(guild: Guild) {

	}

}


export {
	NightModeManager
}
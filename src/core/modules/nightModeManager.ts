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

import { Client, Guild, PermissionFlagsBits } from "discord.js"
import { DatabaseStructure } from "../../../types/database_structure";
import { utcTimezones } from "../../files/locales.ts";

type nightModeData = { guildId: string, data: DatabaseStructure.NightMode | undefined }[];
type checked_nightmode_response = "started" | "ended";

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

				// Check if the time is between the start and end of the night
				const response = await this.calculate_window_time(guild, guildObject.data!);
				if (response === "started" && !await this.isAlreadyHandled("started", guild)) {
					// If the owner should be notified
					if (guildObject.data?.notify) {
						await this.Notify_Server_Owner(guild, guildObject.data!, response);
					}
					// Remove all PA
					await this.Remove_All_PA(guild, guildObject);
				} else if (response === "ended" && !await this.isAlreadyHandled("ended", guild)) {
					// If the owner should be notified
					if (guildObject.data?.notify) {
						await this.Notify_Server_Owner(guild, guildObject.data!, response);
					}
					// Add all PA
					await this.Add_All_PA(guild, guildObject);
				}
			} catch (err) {
				console.log(err)
			}
		}
	}

	private async calculate_window_time(guild: Guild, guildObject: DatabaseStructure.NightMode): Promise<checked_nightmode_response> {
		const guildTimezone = utcTimezones[guildObject.utc];
		const now = new Date();

		// Get current time in guild's timezone
		const guildTime = new Intl.DateTimeFormat('en-US', {
			timeZone: guildTimezone,
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(now);

		const [currentHour, currentMinute] = guildTime.split(':').map(Number);
		const currentTimeInMinutes = currentHour * 60 + currentMinute;

		const startTimeInMinutes = guildObject.time[0] * 60;
		const endTimeInMinutes = guildObject.time[1] * 60;

		// Handle overnight periods (e.g., 22:00 to 06:00)
		if (startTimeInMinutes > endTimeInMinutes) {
			// Night mode spans midnight
			if (currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes) {
				return "started";
			} else {
				return "ended";
			}
		} else {
			// Normal day period
			if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
				return "started";
			} else {
				return "ended";
			}
		}
	}

	private async Add_All_PA(guild: Guild, guildObject: nightModeData[0]): Promise<void> {
		// Check: check if the bot is Administrator
		const {
			im_self_admin,
			im_on_top,
			is_admin
		} = this.Basics_Check(guild);

		console.log(
			im_self_admin,
			im_on_top,
			is_admin
		)
		await guild.client.db.set(`${guild.id}.UTILS.NIGHT_MODE.last_state`, "ended")
	}

	public Basics_Check(guild: Guild) {
		let is_admin = guild.members.me?.permissions.has(PermissionFlagsBits.Administrator);
		let bot_role = guild.members.me?.roles.botRole;
		let im_self_admin = bot_role?.permissions.has(PermissionFlagsBits.Administrator);
		let im_on_top = guild.roles.cache.sort((a, b) => b.position - a.position).first() === bot_role;
		return {
			is_admin,
			bot_role,
			im_self_admin,
			im_on_top
		}
	}

	private async Remove_All_PA(guild: Guild, guildObject: nightModeData[0]): Promise<void> {
		// Check: check if the bot is Administrator
		const {
			im_self_admin,
			im_on_top,
			is_admin
		} = this.Basics_Check(guild);

		console.log(
			im_self_admin,
			im_on_top,
			is_admin
		)

		await guild.client.db.set(`${guild.id}.UTILS.NIGHT_MODE.last_state`, "started")
	}

	private async Notify_Server_Owner(guild: Guild, guildObject: DatabaseStructure.NightMode, type: checked_nightmode_response) {
		let server_owner = (await guild.fetchOwner());
		await server_owner.user.send({
			content: `Le mode nuit est ${type === "started" ? "activé" : "désactivé"}`,
			embeds: [
				{
					title: "Mode Nuit",
					description: `Le mode nuit est ${type === "started" ? "activé" : "désactivé"}`,
					color: guildObject.notify ? 0x00FF00 : 0xFF0000,
					fields: [
						{
							name: "Plage horaire",
							value: `${this.time_beautifuer(guildObject.time)} (fuseau UTC sur ${utcTimezones[guildObject.utc]})`,
							inline: true
						}
					]
				}
			]
		}).catch(() => { })
	}

	// Input: 21
	// Result: 21:00 / 9PM
	public hour_beautifuer(str: number, format: "12h" | "24h" = "24h") {
		if (format === "12h") {
			return `${str}:00 / ${str}PM`
		} else {
			return `${str < 10 ? '0' : ''}${str}:00`
		}
	}

	public time_beautifuer(str: number[]) {
		return `${this.hour_beautifuer(str[0])} - ${this.hour_beautifuer(str[1])}`
	}

	public async isAlreadyHandled(type: checked_nightmode_response, guild: Guild): Promise<boolean> {
		// Get night mode config for this guild
		const nightModeData: DatabaseStructure.NightMode | undefined = await this.client.db.get(`${guild.id}.UTILS.NIGHT_MODE`);
		if (!nightModeData) return false;

		// If last action is the same as the current one, no need to repeat it
		if (nightModeData.last_state === type) return true;

		return false;
	}

}


export {
	NightModeManager
}
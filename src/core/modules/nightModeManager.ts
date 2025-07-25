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

import { Client, Guild, MessageCreateOptions, PermissionFlagsBits, PermissionsBitField, Role } from "discord.js"
import { DatabaseStructure } from "../../../types/database_structure";
import { utcTimezones } from "../../files/locales.ts";
import { LanguageData } from "../../../types/languageData";

type nightModeData = { guildId: string, data: DatabaseStructure.NightMode | undefined }[];
type checked_nightmode_response = "started" | "ended";

class NightModeManager {
	public async init() {
		this.Refresh(await this.GetNightModeData());
		setInterval(async () => {
			this.Refresh(await this.GetNightModeData())
		}, 60_000 * 5)
	}

	private async GetNightModeData(): Promise<nightModeData> {
		const all = await client.db.all();
		return all
			.filter(v => Number(v.id) && client.inShard(v.id))
			.map(v => {
				const guildObject = v.value as DatabaseStructure.DbInId;
				return { guildId: v.id, data: guildObject.UTILS?.NIGHT_MODE?.enabled ? guildObject.UTILS?.NIGHT_MODE : undefined };
			})
			.filter(v => v.data);
	}

	private async Refresh(nightModeData: nightModeData) {
		for (const guildObject of nightModeData) {
			try {
				const guild = await client.guilds.fetch(guildObject.guildId).catch(() => null);
				if (!guild) continue;

				// Check if the time is between the start and end of the night
				const response = await this.calculate_window_time(guildObject.data!);
				if (response === "started" && !await this.isAlreadyHandled("started", guild)) {
					const lang = await client.func.getLanguageData(guild.id);

					// If the owner should be notified
					if (guildObject.data?.notify) {
						await this.Notify_Server_Owner(guild, { type: "started", guildObject: guildObject.data, lang });
					}
					// Remove all PA
					await this.Remove_All_PA(guild, guildObject, lang);
				} else if (response === "ended" && !await this.isAlreadyHandled("ended", guild)) {
					const lang = await client.func.getLanguageData(guild.id);

					// If the owner should be notified
					if (guildObject.data?.notify) {
						await this.Notify_Server_Owner(guild, { type: "ended", guildObject: guildObject.data, lang });
					}
					// Add all PA
					await this.Add_All_PA(guild, guildObject, lang);
				}
			} catch (err) {
				console.error(err)
			}
		}
	}

	private async calculate_window_time(guildObject: DatabaseStructure.NightMode): Promise<checked_nightmode_response> {
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

		// New format: [startHour, startMinute, endHour, endMinute]
		let startTimeInMinutes = guildObject.time[0] * 60 + guildObject.time[1];;
		let endTimeInMinutes = guildObject.time[2] * 60 + guildObject.time[3];;

		// Handle overnight periods (e.g., 22:30 to 06:15)
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

	private async Add_All_PA(guild: Guild, guildObject: nightModeData[0], lang: LanguageData): Promise<void> {
		// Check: check if the bot is Administrator
		const {
			im_self_admin,
			im_on_top,
			is_admin
		} = this.Basics_Check(guild);

		await guild.client.db.set(`${guild.id}.UTILS.NIGHT_MODE.last_state`, "ended");

		if (!im_self_admin || !im_on_top || !is_admin) {
			this.warn_owner(guild, {
				type: "ended",
				im_on_top,
				im_self_admin: im_self_admin || false,
				lang
			});
			return
		};

		// if all conditions is passed. Do the job
		const all_changed_roles: DatabaseStructure.NightMode["changed_roles"] = await guild.client.db.get(`${guild.id}.UTILS.NIGHT_MODE.changed_roles`) || [];
		let changed_roles: string[] = [];
		if (!all_changed_roles) return;
		for (const role of all_changed_roles) {
			const roleObject = await guild.roles.fetch(role).catch(() => null);
			if (!roleObject) continue;
			changed_roles.push(roleObject.name);
			await roleObject.setPermissions(new PermissionsBitField(roleObject.permissions).add(PermissionFlagsBits.Administrator));
		}

		let msg = "";
		msg += lang.var_nm_end_main;

		if (changed_roles.length > 0) {
			msg += lang.var_nm_edited_roles + `\n>>> ${changed_roles.map(x => '@' + x + '').join("\n")}`;
		}

		this.Notify_Server_Owner(guild, {
			type: "ended",
			msg: {
				content: msg
			},
			lang
		});

		await guild.client.db.delete(`${guild.id}.UTILS.NIGHT_MODE.changed_roles`);
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

	private warn_owner(guild: Guild, opt: { type: checked_nightmode_response, im_on_top: boolean, im_self_admin: boolean, lang: LanguageData }) {
		let type = opt.type === "started" ? opt.lang.var_nm_running : opt.lang.var_nm_stopping;
		let warn_msg = opt.lang.var_nm_error_occured.replace("${type}", type);

		if (!opt.im_on_top) {
			warn_msg += opt.lang.var_nm_role_app_not_high.replace("${client.iHorizon_Emojis.Warning_Icon}", '-');
		}

		if (!opt.im_self_admin) {
			warn_msg += opt.lang.var_nm_role_app_not_admin.replace("${client.iHorizon_Emojis.Warning_Icon}", '-')
		}

		this.Notify_Server_Owner(guild, {
			type: "ended",
			msg: {
				content: warn_msg
			},
			lang: opt.lang
		});
	}

	private async Remove_All_PA(guild: Guild, guildObject: nightModeData[0], lang: LanguageData): Promise<void> {
		// Check: check if the bot is Administrator
		const {
			im_self_admin,
			im_on_top,
			is_admin
		} = this.Basics_Check(guild);

		await guild.client.db.set(`${guild.id}.UTILS.NIGHT_MODE.last_state`, "started");

		if (!im_self_admin || !im_on_top || !is_admin) {
			this.warn_owner(guild, {
				type: "started",
				im_on_top,
				im_self_admin: im_self_admin || false,
				lang
			});
			return
		};

		// if all conditions is passed. Do the job
		const all_pa_roles = (await guild.roles.fetch()).filter(role => role.permissions.has(PermissionFlagsBits.Administrator)).values().toArray();
		let filtered_pa_roles = all_pa_roles
			.filter(x => x.id !== x.guild.members.me?.roles.botRole?.id);

		if (guildObject.data?.derankBot && guildObject.data.wlBots) {
			filtered_pa_roles = filtered_pa_roles.filter(role =>
				!role.managed || (guildObject.data?.wlBots || []).includes(role.id)
			);
		}

		for (let role of filtered_pa_roles) {
			const newPermissions = new PermissionsBitField(role.permissions).remove(PermissionFlagsBits.Administrator);
			await role.setPermissions(newPermissions);
		}

		let msg = "";
		msg += lang.var_nm_start_main;

		if (filtered_pa_roles.length > 0) {
			msg += lang.var_nm_edited_roles + `\n>>> ${filtered_pa_roles.map(x => '@' + x.name + '').join("\n")}`;
		}

		this.Notify_Server_Owner(guild, {
			type: "started",
			msg: {
				content: msg
			},
			lang
		});

		await guild.client.db.set(`${guild.id}.UTILS.NIGHT_MODE.changed_roles`, filtered_pa_roles.map(x => x.id));
	}

	private async Notify_Server_Owner(guild: Guild, opt: { type: checked_nightmode_response, msg?: MessageCreateOptions, guildObject?: DatabaseStructure.NightMode, lang: LanguageData }) {
		let server_owner = (await guild.fetchOwner());
		let type = opt.type === "started" ? opt.lang.var_nm_running2 : opt.lang.var_nm_stopping2;

		await server_owner.user.send(opt.msg || {
			embeds: [
				{
					title: opt.lang.var_nm_title,
					description: opt.lang.var_nm_ping_embed_title.replace("${type}", type),
					color: opt.guildObject?.notify ? 0x00FF00 : 0xFF0000,
					fields: [
						{
							name: opt.lang.var_nm_ping_embed_fields_0_name,
							value: `${this.time_beautifuer(opt.guildObject?.time!)} (${opt.lang.nightmode_utc_timezone_on} ${utcTimezones[opt.guildObject?.utc!]})`,
							inline: true
						}
					]
				}
			]
		}).catch(() => { })
	}

	// Input: 21, 30
	// Result: 21:30 / 9:30PM
	public time_beautifuer_with_minutes(hour: number, minute: number, format: "12h" | "24h" = "24h") {
		if (format === "12h") {
			const period = hour < 12 || hour === 24 ? "AM" : "PM";
			const displayHour = hour % 12 === 0 ? 12 : hour % 12;
			return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
		} else {
			return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
		}
	}

	public time_beautifuer(timeArray: number[]) {
		if (timeArray.length === 4) {
			// New format: [startHour, startMinute, endHour, endMinute]
			const startTime24 = this.time_beautifuer_with_minutes(timeArray[0], timeArray[1], "24h");
			const endTime24 = this.time_beautifuer_with_minutes(timeArray[2], timeArray[3], "24h");
			const startTime12 = this.time_beautifuer_with_minutes(timeArray[0], timeArray[1], "12h");
			const endTime12 = this.time_beautifuer_with_minutes(timeArray[2], timeArray[3], "12h");

			return `${startTime24} - ${endTime24} (${startTime12} - ${endTime12})`;
		} else {
			throw new Error("Invalid time format");
		}
	}

	public async isAlreadyHandled(type: checked_nightmode_response, guild: Guild): Promise<boolean> {
		// Get night mode config for this guild
		const nightModeData = await (client.db.get(`${guild.id}.UTILS.NIGHT_MODE`)) as DatabaseStructure.NightMode | undefined;
		if (!nightModeData) return false;

		// If last action is the same as the current one, no need to repeat it
		if (nightModeData.last_state === type) return true;

		return false;
	}

}

export {
	NightModeManager
}
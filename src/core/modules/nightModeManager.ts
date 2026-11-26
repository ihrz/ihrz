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

import {
	Guild,
	MessageCreateOptions,
	PermissionFlagsBits,
	PermissionsBitField,
	Role
} from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure";
import { utcTimezones } from "../locales.ts";
import { LanguageData } from "../../../types/languageData";

type nightModeData = {
	guildId: string;
	data: DatabaseStructure.NightMode | undefined;
}[];
type checked_nightmode_response = "started" | "ended";

/** Whether night mode takes Administrator away from this role (bots: see `derankBot` / `wlBots`). */
export function keepsDerank(
	role: Pick<Role, "managed"> & {
		tags?: { botId?: string | null } | null;
		id: string;
	},
	data: Pick<DatabaseStructure.NightMode, "derankBot" | "wlBots"> | undefined
): boolean {
	if (!role.managed) return true;
	if (!data?.derankBot) return false;
	const allowed = new Set(data.wlBots ?? []);
	return (
		!(role.tags?.botId && allowed.has(role.tags.botId)) &&
		!allowed.has(role.id)
	);
}

/** Settings the /nightmode panel edits. `last_state` / `changed_roles` belong to the manager. */
const SETTING_KEYS = [
	"enabled",
	"notify",
	"time",
	"derankBot",
	"wlBots",
	"utc"
] as const;

/**
 * Saves the panel's settings one sub-key at a time: a whole-section write
 * from a panel opened before a transition would put back an old
 * `last_state` / `changed_roles` (roles never given back, or stripped twice).
 */
export async function saveNightModeSettings(
	db: { set: (key: string, value: unknown) => Promise<unknown> },
	guildId: string,
	data: Partial<DatabaseStructure.NightMode>
): Promise<void> {
	for (const key of SETTING_KEYS) {
		if (data[key] === undefined) continue;
		await db.set(`${guildId}.UTILS.NIGHT_MODE.${key}`, data[key]);
	}
}

/** Whether a guild's night mode has something to do on this tick (or later). */
function needsPass(data: DatabaseStructure.NightMode | undefined | null) {
	if (!data) return false;
	if (data.enabled) return true;
	// Turned off (command, panel or dashboard) while roles were still taken.
	return (
		(data.changed_roles?.length ?? 0) > 0 || data.last_state === "started"
	);
}

type nightTarget = checked_nightmode_response | "disabled";
type passResult = {
	ok: boolean;
	changed: string[];
	im_on_top: boolean;
	im_self_admin: boolean;
};
/** A transition not done yet: retried every tick, the owner is warned once. */
type pendingTransition = {
	target: nightTarget;
	warned: boolean;
	changed: string[];
	logged: Set<string>;
};

class NightModeManager {
	private pending = new Map<string, pendingTransition>();
	private running = new Set<string>();

	public async init() {
		this.Refresh(await this.GetNightModeData());
		setInterval(async () => {
			this.Refresh(await this.GetNightModeData());
		}, 60_000 /* * 5 */);
	}

	private async GetNightModeData(): Promise<nightModeData> {
		const result: nightModeData = [];

		for (const guild of client.guilds.cache.values()) {
			// Only the sub-key is needed: never pull the whole guild document.
			const nightMode = await client.db.get<DatabaseStructure.NightMode>(
				`${guild.id}.UTILS.NIGHT_MODE`
			);
			if (needsPass(nightMode))
				result.push({ guildId: guild.id, data: nightMode! });
		}

		return result;
	}

	/** Runs one guild's pass now (the panel calls it after saving). */
	public async refreshGuild(guildId: string): Promise<void> {
		const data = await client.db.get<DatabaseStructure.NightMode>(
			`${guildId}.UTILS.NIGHT_MODE`
		);
		if (!needsPass(data)) {
			this.pending.delete(guildId);
			return;
		}
		await this.Refresh([{ guildId, data: data! }]);
	}

	private async Refresh(nightModeData: nightModeData) {
		for (const guildObject of nightModeData) {
			// A slow pass must not overlap the next tick or a panel save.
			if (this.running.has(guildObject.guildId)) continue;
			this.running.add(guildObject.guildId);
			try {
				const guild = await client.guilds
					.fetch(guildObject.guildId)
					.catch(() => null);
				if (!guild) continue;
				await this.runGuild(guild, guildObject);
			} catch (err) {
				logger.err(err);
			} finally {
				this.running.delete(guildObject.guildId);
			}
		}
	}

	/**
	 * `last_state` is written only once the transition is fully done: a pass
	 * that could not strip (or give back) every role is retried on the next
	 * tick, instead of waiting for the next transition.
	 */
	private async runGuild(guild: Guild, guildObject: nightModeData[0]) {
		const data = guildObject.data!;
		const target: nightTarget = data.enabled
			? await this.calculate_window_time(data)
			: "disabled";
		const done =
			target === "disabled"
				? !needsPass(data)
				: data.last_state === target;
		if (done) {
			this.pending.delete(guild.id);
			return;
		}

		let entry = this.pending.get(guild.id);
		const firstTry = entry?.target !== target;
		if (!entry || firstTry) {
			entry = { target, warned: false, changed: [], logged: new Set() };
			this.pending.set(guild.id, entry);
		}

		const lang = await client.func.getLanguageData(guild.id);
		const direction: checked_nightmode_response =
			target === "started" ? "started" : "ended";

		if (firstTry && data.notify && target !== "disabled") {
			await this.Notify_Server_Owner(guild, {
				type: direction,
				guildObject: data,
				lang
			});
		}

		const result =
			target === "started"
				? await this.Remove_All_PA(
						guild,
						guildObject,
						lang,
						entry.logged
					)
				: await this.Add_All_PA(guild, guildObject, lang, entry.logged);
		entry.changed.push(...result.changed);

		if (!result.ok) {
			// Once per failure episode, not on every retry.
			if (!entry.warned && data.notify) {
				this.warn_owner(guild, {
					type: direction,
					im_on_top: result.im_on_top,
					im_self_admin: result.im_self_admin,
					lang
				});
			}
			entry.warned = true;
			return;
		}

		await guild.client.db.set(
			`${guild.id}.UTILS.NIGHT_MODE.last_state`,
			direction
		);
		this.pending.delete(guild.id);

		// Turned off with nothing to give back: no message.
		if (!data.notify || (target === "disabled" && !entry.changed.length))
			return;
		let msg =
			direction === "started"
				? lang.var_nm_start_main
				: lang.var_nm_end_main;
		if (entry.changed.length > 0) {
			msg +=
				lang.var_nm_edited_roles +
				`\n>>> ${entry.changed.map((x) => "@" + x).join("\n")}`;
		}
		await this.Notify_Server_Owner(guild, {
			type: direction,
			msg: { content: msg },
			lang
		});
	}

	private async calculate_window_time(
		guildObject: DatabaseStructure.NightMode
	): Promise<checked_nightmode_response> {
		const guildTimezone = utcTimezones[guildObject.utc];
		const now = new Date();

		// Get current time in guild's timezone
		const guildTime = new Intl.DateTimeFormat("en-US", {
			timeZone: guildTimezone,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		}).format(now);

		const [currentHour, currentMinute] = guildTime.split(":").map(Number);
		const currentTimeInMinutes = currentHour * 60 + currentMinute;

		// New format: [startHour, startMinute, endHour, endMinute]
		const startTimeInMinutes =
			guildObject.time[0] * 60 + guildObject.time[1];
		const endTimeInMinutes = guildObject.time[2] * 60 + guildObject.time[3];

		// Handle overnight periods (e.g., 22:30 to 06:15)
		if (startTimeInMinutes > endTimeInMinutes) {
			// Night mode spans midnight
			if (
				currentTimeInMinutes >= startTimeInMinutes ||
				currentTimeInMinutes <= endTimeInMinutes
			) {
				return "started";
			} else {
				return "ended";
			}
		} else {
			// Normal day period
			if (
				currentTimeInMinutes >= startTimeInMinutes &&
				currentTimeInMinutes <= endTimeInMinutes
			) {
				return "started";
			} else {
				return "ended";
			}
		}
	}

	/** Gives Administrator back to the saved roles; the failed ones stay saved. */
	private async Add_All_PA(
		guild: Guild,
		guildObject: nightModeData[0],
		lang: LanguageData,
		logged?: Set<string>
	): Promise<passResult> {
		const all_changed_roles: string[] =
			((await guild.client.db.get(
				`${guild.id}.UTILS.NIGHT_MODE.changed_roles`
			)) as DatabaseStructure.NightMode["changed_roles"]) || [];

		// Nothing to give back: done, whatever the bot's own role looks like.
		if (all_changed_roles.length === 0)
			return {
				ok: true,
				changed: [],
				im_on_top: true,
				im_self_admin: true
			};

		// Check: check if the bot is Administrator
		const { im_self_admin, im_on_top, is_admin } = this.Basics_Check(guild);
		if (!im_self_admin || !im_on_top || !is_admin) {
			return {
				ok: false,
				changed: [],
				im_on_top: !!im_on_top,
				im_self_admin: !!im_self_admin
			};
		}

		const changed_roles: string[] = [];
		// Roles whose update failed stay saved, to be given back next tick.
		const failed_roles: string[] = [];
		for (const role of all_changed_roles) {
			const roleObject = await guild.roles.fetch(role).catch(() => null);
			if (!roleObject) continue;
			try {
				await roleObject.setPermissions(
					new PermissionsBitField(roleObject.permissions).add(
						PermissionFlagsBits.Administrator
					)
				);
				changed_roles.push(roleObject.name);
			} catch (error) {
				failed_roles.push(role);
				if (!logged?.has(role)) {
					logged?.add(role);
					logger.err(
						`nightmode: unable to restore the role ${role} in ${guild.id}: ${error}`
					);
				}
			}
		}

		if (failed_roles.length > 0) {
			await guild.client.db.set(
				`${guild.id}.UTILS.NIGHT_MODE.changed_roles`,
				failed_roles
			);
		} else {
			await guild.client.db.delete(
				`${guild.id}.UTILS.NIGHT_MODE.changed_roles`
			);
		}

		return {
			ok: failed_roles.length === 0,
			changed: changed_roles,
			im_on_top: true,
			im_self_admin: true
		};
	}

	public Basics_Check(guild: Guild) {
		const is_admin = guild.members.me?.permissions.has(
			PermissionFlagsBits.Administrator
		);
		const bot_role = guild.members.me?.roles.botRole;
		const im_self_admin = bot_role?.permissions.has(
			PermissionFlagsBits.Administrator
		);
		const im_on_top =
			guild.roles.cache
				.sort((a, b) => b.position - a.position)
				.first() === bot_role;
		return {
			is_admin,
			bot_role,
			im_self_admin,
			im_on_top
		};
	}

	private warn_owner(
		guild: Guild,
		opt: {
			type: checked_nightmode_response;
			im_on_top: boolean;
			im_self_admin: boolean;
			lang: LanguageData;
		}
	) {
		const type =
			opt.type === "started"
				? opt.lang.var_nm_running
				: opt.lang.var_nm_stopping;
		// Languages come with emojis resolved: this message wants a plain dash.
		let warn_msg = opt.lang.var_nm_error_occured.replace("${type}", type);

		if (!opt.im_on_top) {
			warn_msg += opt.lang.var_nm_role_app_not_high.replace(
				client.iHorizon_Emojis.Warning_Icon,
				"-"
			);
		}

		if (!opt.im_self_admin) {
			warn_msg += opt.lang.var_nm_role_app_not_admin.replace(
				client.iHorizon_Emojis.Warning_Icon,
				"-"
			);
		}

		this.Notify_Server_Owner(guild, {
			type: "ended",
			msg: {
				content: warn_msg
			},
			lang: opt.lang
		});
	}

	/** Takes Administrator away; a role that could not be edited keeps it and is retried. */
	private async Remove_All_PA(
		guild: Guild,
		guildObject: nightModeData[0],
		lang: LanguageData,
		logged?: Set<string>
	): Promise<passResult> {
		// Check: check if the bot is Administrator
		const { im_self_admin, im_on_top, is_admin } = this.Basics_Check(guild);

		if (!im_self_admin || !im_on_top || !is_admin) {
			return {
				ok: false,
				changed: [],
				im_on_top: !!im_on_top,
				im_self_admin: !!im_self_admin
			};
		}

		// if all conditions is passed. Do the job
		const all_pa_roles = (await guild.roles.fetch())
			.filter((role) =>
				role.permissions.has(PermissionFlagsBits.Administrator)
			)
			.values()
			.toArray();
		let filtered_pa_roles = all_pa_roles.filter(
			(x) => x.id !== x.guild.members.me?.roles.botRole?.id
		);

		// A bot's Administrator comes from its own (managed) role. "Derank bots" off: bots keep it.
		// On: they lose it too, except the allowed bots (bot user ids, chosen in /nightmode).
		filtered_pa_roles = filtered_pa_roles.filter((role) =>
			keepsDerank(role, guildObject.data)
		);

		const changed_roles: string[] = [];
		let failed = 0;
		// Roles still waiting to be given back from an earlier night are kept.
		const saved_role_ids = new Set<string>(
			((await guild.client.db.get(
				`${guild.id}.UTILS.NIGHT_MODE.changed_roles`
			)) as DatabaseStructure.NightMode["changed_roles"]) || []
		);

		for (const role of filtered_pa_roles) {
			const newPermissions = new PermissionsBitField(
				role.permissions
			).remove(PermissionFlagsBits.Administrator);

			try {
				await role.setPermissions(newPermissions);
				changed_roles.push(role.name);
				saved_role_ids.add(role.id);
				await guild.client.db.set(
					`${guild.id}.UTILS.NIGHT_MODE.changed_roles`,
					[...saved_role_ids]
				);
			} catch (error) {
				failed++;
				if (!logged?.has(role.id)) {
					logged?.add(role.id);
					logger.err(
						`nightmode: unable to edit the role ${role.id} in ${guild.id}: ${error}`
					);
				}
			}
		}

		return {
			ok: failed === 0,
			changed: changed_roles,
			im_on_top: true,
			im_self_admin: true
		};
	}

	private async Notify_Server_Owner(
		guild: Guild,
		opt: {
			type: checked_nightmode_response;
			msg?: MessageCreateOptions;
			guildObject?: DatabaseStructure.NightMode;
			lang: LanguageData;
		}
	) {
		const server_owner = await guild.fetchOwner();
		const type =
			opt.type === "started"
				? opt.lang.var_nm_running2
				: opt.lang.var_nm_stopping2;

		await server_owner.user
			.send(
				opt.msg || {
					embeds: [
						{
							title: opt.lang.var_nm_title,
							description:
								opt.lang.var_nm_ping_embed_title.replace(
									"${type}",
									type
								),
							color: opt.guildObject?.notify
								? 0x00ff00
								: 0xff0000,
							fields: [
								{
									name: opt.lang
										.var_nm_ping_embed_fields_0_name,
									value: `${this.time_beautifuer(opt.guildObject?.time as number[])} (${opt.lang.nightmode_utc_timezone_on} ${utcTimezones[opt.guildObject?.utc as number]})`,
									inline: true
								}
							]
						}
					]
				}
			)
			.catch(() => {});
	}

	// Input: 21, 30
	// Result: 21:30 / 9:30PM
	public time_beautifuer_with_minutes(
		hour: number,
		minute: number,
		format: "12h" | "24h" = "24h"
	) {
		if (format === "12h") {
			const period = hour < 12 || hour === 24 ? "AM" : "PM";
			const displayHour = hour % 12 === 0 ? 12 : hour % 12;
			return `${displayHour}:${minute.toString().padStart(2, "0")}${period}`;
		} else {
			return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
		}
	}

	public time_beautifuer(timeArray: number[]) {
		if (timeArray.length === 4) {
			// New format: [startHour, startMinute, endHour, endMinute]
			const startTime24 = this.time_beautifuer_with_minutes(
				timeArray[0],
				timeArray[1],
				"24h"
			);
			const endTime24 = this.time_beautifuer_with_minutes(
				timeArray[2],
				timeArray[3],
				"24h"
			);
			const startTime12 = this.time_beautifuer_with_minutes(
				timeArray[0],
				timeArray[1],
				"12h"
			);
			const endTime12 = this.time_beautifuer_with_minutes(
				timeArray[2],
				timeArray[3],
				"12h"
			);

			return `${startTime24} - ${endTime24} (${startTime12} - ${endTime12})`;
		} else {
			throw new Error("Invalid time format");
		}
	}

	public async isAlreadyHandled(
		type: checked_nightmode_response,
		guild: Guild
	): Promise<boolean> {
		// Get night mode config for this guild
		const nightModeData = (await client.db.get(
			`${guild.id}.UTILS.NIGHT_MODE`
		)) as DatabaseStructure.NightMode | undefined;
		if (!nightModeData) return false;

		// If last action is the same as the current one, no need to repeat it
		if (nightModeData.last_state === type) return true;

		return false;
	}
}

export { NightModeManager };

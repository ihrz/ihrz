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

import { Client, Guild, GuildMember } from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

// What an action receives. `actor` is the dashboard user, fetched from the
// guild: an action runs with the bot's rights on behalf of this member.
export interface ActionContext {
	client: Client;
	guild: Guild;
	actor: GuildMember;
	params: Params;
	lang: LanguageData;
}

export interface ActionDef {
	// The slash command this action does the work of ("ban", "music play"):
	// the actor needs what that command needs (custom `/perm` rules, then its
	// native permission), exactly like `commandExecutor`.
	command?: string;
	// Only the server owner (`/perm edit-roles`, `/backup load`…).
	ownerOnly?: boolean;
	run(ctx: ActionContext): Promise<unknown>;
}

export type ActionGroup = Record<string, ActionDef>;

// Errors sent back to the dashboard as they are (English, no internals).
// "forbidden: …" → 403, "… not found" → 404, anything else → 400.
export class ActionError extends Error {}

export const fail = (message: string): never => {
	throw new ActionError(message);
};

const SNOWFLAKE = /^\d{17,20}$/;

// Typed access to the parameters. GET actions get strings only: numbers and
// booleans are parsed from them too.
export class Params {
	constructor(private readonly raw: Record<string, unknown>) {}

	has(key: string): boolean {
		const v = this.raw[key];
		return v !== undefined && v !== null && v !== "";
	}

	str(key: string, opts: { max?: number; optional?: boolean } = {}): string {
		const v = this.raw[key];
		if (v === undefined || v === null || v === "") {
			if (opts.optional) return "";
			return fail(`missing parameter: ${key}`);
		}
		if (typeof v !== "string") return fail(`invalid parameter: ${key}`);
		if (v.length > (opts.max ?? 2000))
			return fail(`parameter too long: ${key}`);
		return v;
	}

	optStr(key: string, max?: number): string | null {
		return this.has(key) ? this.str(key, { max }) : null;
	}

	id(key: string): string {
		const v = this.str(key);
		if (!SNOWFLAKE.test(v)) return fail(`invalid parameter: ${key}`);
		return v;
	}

	optId(key: string): string | null {
		return this.has(key) ? this.id(key) : null;
	}

	ids(key: string, max = 100): string[] {
		const v = this.raw[key];
		const list = typeof v === "string" ? v.split(",").filter(Boolean) : v;
		if (!Array.isArray(list) || list.length > max)
			return fail(`invalid parameter: ${key}`);
		for (const x of list) {
			if (typeof x !== "string" || !SNOWFLAKE.test(x))
				return fail(`invalid parameter: ${key}`);
		}
		return [...new Set(list as string[])];
	}

	int(
		key: string,
		opts: { min?: number; max?: number; def?: number } = {}
	): number {
		const v = this.raw[key];
		if (
			(v === undefined || v === null || v === "") &&
			opts.def !== undefined
		)
			return opts.def;
		const n = typeof v === "string" ? Number(v) : v;
		if (typeof n !== "number" || !Number.isInteger(n))
			return fail(`invalid parameter: ${key}`);
		if (opts.min !== undefined && n < opts.min)
			return fail(`${key} must be at least ${opts.min}`);
		if (opts.max !== undefined && n > opts.max)
			return fail(`${key} must be at most ${opts.max}`);
		return n;
	}

	bool(key: string, def = false): boolean {
		const v = this.raw[key];
		if (v === undefined || v === null || v === "") return def;
		if (v === true || v === "true" || v === "1") return true;
		if (v === false || v === "false" || v === "0") return false;
		return fail(`invalid parameter: ${key}`);
	}

	oneOf<T extends string>(key: string, values: readonly T[], def?: T): T {
		if (!this.has(key) && def !== undefined) return def;
		const v = this.str(key);
		if (!(values as readonly string[]).includes(v))
			return fail(`invalid parameter: ${key}`);
		return v as T;
	}

	raw_(key: string): unknown {
		return this.raw[key];
	}
}

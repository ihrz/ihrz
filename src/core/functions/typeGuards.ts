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

/**
 * Shape checks used instead of `instanceof` everywhere in the codebase (an ESLint rule forbids it): a second
 * copy of a package in node_modules (discord.js…), a value from another realm or a plain object built in a test
 * all fail `instanceof` while having the right shape. Each guard reads only what it promises.
 */
import {
	ChannelType,
	ComponentType,
	type BaseGuildTextChannel,
	type DiscordAPIError,
	type Guild,
	type GuildMember,
	type Role,
	type User
} from "discord.js";

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null;

/** Any thrown error-like value (Error and its subclasses): a string `message` and `name`. */
export function isError(value: unknown): value is Error {
	return (
		isObject(value) &&
		typeof value.message === "string" &&
		typeof value.name === "string"
	);
}

/** The message of an error, else the value as text (what `e instanceof Error ? e.message : String(e)` did). */
export function errorMessage(value: unknown): string {
	return isError(value) ? value.message : String(value);
}

/** An error of one of our classes, by the `name` each sets (LibraryError, ActionError, BackupBusyError…). */
export function hasErrorName(value: unknown, name: string): value is Error {
	return isError(value) && value.name === name;
}

/** A REST error from Discord (it carries the HTTP status and Discord's raw error). */
export function isDiscordApiError(value: unknown): value is DiscordAPIError {
	return (
		isError(value) &&
		"rawError" in value &&
		"status" in value &&
		"code" in value
	);
}

/** A Date object (any realm). */
export function isDate(value: unknown): value is Date {
	return Object.prototype.toString.call(value) === "[object Date]";
}

/** A Map, discord.js Collections included. */
export function isMap(value: unknown): value is Map<unknown, unknown> {
	return Object.prototype.toString.call(value) === "[object Map]";
}

/** A plain object-like value (not null; arrays included, as `instanceof Object` did). */
export function isObjectLike(value: unknown): value is object {
	return isObject(value);
}

/** A guild member: its user, its guild and its role manager. */
export function isGuildMember(value: unknown): value is GuildMember {
	return (
		isObject(value) &&
		isObject(value.user) &&
		isObject(value.guild) &&
		isObject(value.roles) &&
		"joinedTimestamp" in value
	);
}

/** A role: a guild, a position and permissions (a member has no `hoist`). */
export function isRole(value: unknown): value is Role {
	return (
		isObject(value) &&
		isObject(value.guild) &&
		typeof value.position === "number" &&
		typeof value.hoist === "boolean" &&
		"permissions" in value
	);
}

/** A guild: its members and roles managers, and no `guild` of its own. */
export function isGuild(value: unknown): value is Guild {
	return (
		isObject(value) &&
		isObject(value.members) &&
		isObject(value.roles) &&
		isObject(value.channels) &&
		!("guild" in value)
	);
}

/** A Discord user (not a member). */
export function isUser(value: unknown): value is User {
	return (
		isObject(value) &&
		typeof value.username === "string" &&
		typeof value.bot === "boolean" &&
		!("guild" in value)
	);
}

/** A component builder of a given type (ButtonBuilder → Button, SectionBuilder → Section…), by its `data.type`. */
export function isComponentBuilder(
	value: unknown,
	type: ComponentType
): boolean {
	return (
		isObject(value) &&
		isObject(value.data) &&
		value.data.type === type &&
		typeof value.toJSON === "function"
	);
}

/**
 * A channel of one of these types (`ChannelType.GuildText`, `GuildVoice`…). Only channels have `isTextBased()`:
 * a message's `type` is a message type (0 too), never mistaken for a channel's.
 */
export function isChannelOfType(
	value: unknown,
	...types: ChannelType[]
): boolean {
	return (
		isObject(value) &&
		typeof value.isTextBased === "function" &&
		typeof value.type === "number" &&
		types.includes(value.type as ChannelType)
	);
}

/** A guild text or announcement channel (what `instanceof BaseGuildTextChannel` matched). */
export function isGuildTextChannel(
	value: unknown
): value is BaseGuildTextChannel {
	return isChannelOfType(
		value,
		ChannelType.GuildText,
		ChannelType.GuildAnnouncement
	);
}

export { ChannelType, ComponentType };

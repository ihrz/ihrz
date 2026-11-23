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

import { authRestoreTable } from "../../Events/client/ready.js";
import * as apiUrlParser from "./apiUrlParser.js";
import { axios } from "./axios.js";

export const Oauth2_Link =
	"https://discord.com/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&state={guild_id}";

// {client_id}: id of the app/bot,
// {redirect_uri}: URL OF HORIZON GATEWAY,
// {guild_id}: id of the verified guild,

export interface GuildAuthRestore {
	config: {
		roleId: string;
		securityCode: string;
		author: oauth2Author;
		createDate: number;
		securityCodeUsed: number;
	};
	members: string[];
}

export type SavedMembersAuthRestore = oauth2Member[];

export interface oauth2Member {
	token: string;
	id: string;
	username: string;
	globalName: string;
	registerTimestamp: number;
	locale: string;
}

export interface oauth2Author {
	id: string;
	username: string;
}

export interface AuthRestore_EntryType {
	guildId: string;
	author?: oauth2Author;
	clientId?: string;
	apiToken?: string;
	roleId?: string;
	scope?: string;
}

export interface AuthRestore_ForceJoin_EntryType {
	guildId: string;
	apiToken: string;
	secretCode: string;
	targetGuildId: string;
	membersToForceJoin: string[];
}

export interface AuthRestore_KeyUpdate_EntryType {
	guildId: string;
	apiToken: string;
	secretCode: string;
}

export interface AuthRestore_RoleUpdate_EntryType {
	guildId: string;
	apiToken: string;
	roleId: string;
}

export interface AuthRestore_ForceJoin_ResponseType {
	status: "OK" | "ERR";
	message: string;
}

export interface AuthRestore_ResponseType {
	status: "OK" | "ERR";
	message: string;
	secretCode?: string;
}

export interface Oauth2_Link_Entry {
	author?: oauth2Author;
	clientId?: string;
	apiToken?: string;
	roleId?: string;
	scope?: string;
}

export function createOauth2LinkWithGuild(data: AuthRestore_EntryType): string {
	return Oauth2_Link.replace("{client_id}", data.clientId!)
		.replace("{guild_id}", data.guildId)
		.replace(
			"{redirect_uri}",
			apiUrlParser.HorizonGateway(
				apiUrlParser.GatewayMethod.GenerateOauthLink
			)
		)
		.replace("{scope}", data?.scope || "identify");
}

export function createOauth2LinkWithoutGuild(data: Oauth2_Link_Entry): string {
	return Oauth2_Link.split("&state=")[0]
		.replace("{client_id}", data.clientId!)
		.replace(
			"{redirect_uri}",
			apiUrlParser.HorizonGateway(
				apiUrlParser.GatewayMethod.GenerateOauthLink
			)
		)
		.replace("{scope}", data?.scope || "identify");
}

export async function createAuthRestore(
	data: AuthRestore_EntryType
): Promise<AuthRestore_ResponseType> {
	return (
		(
			await axios.post(
				apiUrlParser.HorizonGatewayInternal(
					apiUrlParser.GatewayMethod.CreateAuthRestoreGuild
				),
				data,
				{ headers: { Accept: "application/json" } }
			)
		).data || {}
	);
}

export async function getGuildDataPerSecretCode(
	secretCode: string
): Promise<{ id: string; data: GuildAuthRestore } | null> {
	const data = await authRestoreTable.all();
	for (const index in data) {
		const entry = data[index];

		if (
			entry.value &&
			entry.value.config &&
			entry.value.config.securityCode === secretCode
		) {
			return { id: entry.id, data: entry.value };
		}
	}

	return null;
}

export async function forceJoinAuthRestore(
	data: AuthRestore_ForceJoin_EntryType
): Promise<AuthRestore_ForceJoin_ResponseType> {
	return (
		(
			await axios.post(
				apiUrlParser.HorizonGatewayInternal(
					apiUrlParser.GatewayMethod.ForceJoinAuthRestore
				),
				data,
				{ headers: { Accept: "application/json" } }
			)
		).data || {}
	);
}

export async function securityCodeUpdate(
	data: AuthRestore_KeyUpdate_EntryType
): Promise<AuthRestore_ForceJoin_ResponseType> {
	return (
		(
			await axios.post(
				apiUrlParser.HorizonGatewayInternal(
					apiUrlParser.GatewayMethod.AddSecurityCodeAmount
				),
				data,
				{ headers: { Accept: "application/json" } }
			)
		).data || {}
	);
}

export async function changeRoleAuthRestore(
	data: AuthRestore_RoleUpdate_EntryType
): Promise<AuthRestore_ForceJoin_ResponseType> {
	return (
		(
			await axios.post(
				apiUrlParser.HorizonGatewayInternal(
					apiUrlParser.GatewayMethod.ChangeRole
				),
				data,
				{ headers: { Accept: "application/json" } }
			)
		).data || {}
	);
}

/** The gateway refuses a force-join of more members than this in one call. */
export const FORCE_JOIN_BATCH = 500;

/** The bits of a `ws` socket the force-join uses (faked in tests). */
export interface ForceJoinSocket {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	on(event: string, listener: (...args: any[]) => void): unknown;
	send(data: string): unknown;
	terminate(): unknown;
}

export interface ForceJoinRun {
	/** Members of the key's server to bring in (not already on the target). */
	members: string[];
	secretCode: string;
	/** The server the key belongs to. */
	guildId: string;
	/** The server the members are added to. */
	targetGuildId: string;
	apiToken: string;
	post?: typeof forceJoinAuthRestore;
	openSocket: (url: string) => ForceJoinSocket;
	onSize?: (total: number) => void;
	onStart?: () => void;
	onAdd?: () => void;
}

export interface ForceJoinResult {
	added: number;
	/** The key now in force: each finished batch replaces it. */
	secretCode: string;
	/** True when the key changed (at least one batch went through). */
	renewed: boolean;
	/** Set when a batch could not run; the batches before it did. */
	error?: string;
}

/** One gateway force-join; resolves with the key that replaces the old one. */
function runBatch(
	run: ForceJoinRun,
	members: string[],
	secretCode: string,
	progress: { size: number; added: number }
): Promise<string> {
	const post = run.post ?? forceJoinAuthRestore;
	return post({
		membersToForceJoin: members,
		apiToken: run.apiToken,
		targetGuildId: run.targetGuildId,
		guildId: run.guildId,
		secretCode
	}).then(
		(res) =>
			new Promise<string>((resolve, reject) => {
				const [url, code] = String(res?.message ?? "").split("%");
				if (res?.status !== "OK" || !url || !code) {
					reject(new Error(res?.message || "force-join refused"));
					return;
				}
				let socket: ForceJoinSocket;
				try {
					socket = run.openSocket(url);
				} catch (error) {
					reject(error);
					return;
				}
				let ended = false;
				socket.on("error", (error: unknown) => {
					if (!ended) reject(error);
				});
				socket.on("open", () => socket.send(`forceJoin%${code}`));
				socket.on("message", (raw: { toString(): string }) => {
					const parts = raw.toString().split(":");
					const value = parts.slice(2).join(":");
					switch (parts[1]) {
						case "size":
							progress.size += Number(value) || 0;
							run.onSize?.(progress.size);
							break;
						case "start":
							run.onStart?.();
							break;
						case "add":
							progress.added++;
							run.onAdd?.();
							break;
						case "end":
							ended = true;
							if (value) resolve(value);
							else reject(new Error("no new key"));
							break;
					}
				});
				socket.on("close", () => {
					socket.terminate();
					if (!ended) reject(new Error("closed before the end"));
				});
			})
	);
}

/**
 * Brings the members in by batches the gateway accepts. Every batch replaces
 * the key, so the next one runs with the new key, and the caller always gets
 * the key in force, even when a later batch fails.
 */
export async function forceJoinInBatches(
	run: ForceJoinRun
): Promise<ForceJoinResult> {
	const progress = { size: 0, added: 0 };
	let secretCode = run.secretCode;
	let renewed = false;
	for (let i = 0; i < run.members.length; i += FORCE_JOIN_BATCH) {
		const batch = run.members.slice(i, i + FORCE_JOIN_BATCH);
		try {
			secretCode = await runBatch(run, batch, secretCode, progress);
			renewed = true;
		} catch (error) {
			return {
				added: progress.added,
				secretCode,
				renewed,
				error: String(error)
			};
		}
	}
	return { added: progress.added, secretCode, renewed };
}

/** DMs the key; tells the author whether the DM went through, once. */
export async function sendKeyByDm(
	send: () => Promise<unknown>,
	notify: (delivered: boolean) => Promise<unknown>
): Promise<boolean> {
	const delivered = await send().then(
		() => true,
		() => false
	);
	await notify(delivered).catch(() => undefined);
	return delivered;
}

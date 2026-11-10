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

import { Client, Guild } from "discord.js";
import WebSocket from "ws";

import { GatewayLink as Protocol } from "../../../types/gateway_link.js";
import {
	GatewayMethod,
	HorizonGatewayInternal
} from "../functions/apiUrlParser.js";
import { applyConfigChanges } from "./gatewayLinkHandlers.js";
import { ActionError, runAction } from "./gatewayLinkActions/index.js";
import { DiscordAPIError } from "discord.js";
import logger from "../logger.js";

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
// The gateway pings every 30 s: silence past this means a dead (half-open)
// connection, closed so that the reconnect loop takes over.
const SILENCE_TIMEOUT_MS = 75_000;

// Persistent WebSocket to HorizonGateway: the dashboard only writes the
// database, the gateway pushes the change here and the bot applies the
// side effects with its own code. One connection per shard, opened by the
// bot (nothing exposed on its side), authenticated with `api.apiToken`.
export class GatewayLink {
	private ws: WebSocket | null = null;
	private delay = RECONNECT_MIN_MS;
	private started = false;
	private silence: ReturnType<typeof setTimeout> | null = null;
	// Events of a guild are applied in order (two quick saves of the same
	// section must not interleave).
	private queues = new Map<string, Promise<void>>();

	constructor(private readonly client: Client) {}

	start(): void {
		if (this.started) return;
		if (!this.client.config.api.apiToken) {
			logger.warn("Gateway link disabled: no api.apiToken configured");
			return;
		}

		this.started = true;
		this.client.on("guildCreate", (guild: Guild) =>
			this.send({ op: "guilds", add: [guild.id] })
		);
		this.client.on("guildDelete", (guild: Guild) =>
			this.send({ op: "guilds", remove: [guild.id] })
		);
		this.connect();
	}

	private url(): string {
		return HorizonGatewayInternal(GatewayMethod.BotLink).replace(
			/^http/,
			"ws"
		);
	}

	private send(frame: Protocol.GuildsUpdate | Protocol.Ack | Protocol.Hello) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(frame));
		}
	}

	private scheduleReconnect(): void {
		setTimeout(() => this.connect(), this.delay);
		this.delay = Math.min(this.delay * 2, RECONNECT_MAX_MS);
	}

	private armSilenceTimer(ws: WebSocket): void {
		if (this.silence) clearTimeout(this.silence);
		this.silence = setTimeout(() => ws.terminate(), SILENCE_TIMEOUT_MS);
	}

	private connect(): void {
		let ws: WebSocket;
		try {
			ws = new WebSocket(this.url());
		} catch (error) {
			logger.err(`Gateway link: invalid gateway URL (${error})`);
			this.scheduleReconnect();
			return;
		}
		this.ws = ws;
		ws.on("ping", () => this.armSilenceTimer(ws));

		ws.on("open", () => {
			this.armSilenceTimer(ws);
			this.send({
				op: "hello",
				token: this.client.config.api.apiToken,
				cluster: String(this.client.shard?.ids[0] ?? 0),
				guilds: [...this.client.guilds.cache.keys()]
			});
		});

		ws.on("message", (raw) => {
			this.armSilenceTimer(ws);
			let frame: Protocol.Ready | Protocol.Event;
			try {
				frame = JSON.parse(raw.toString());
			} catch {
				return;
			}

			if (frame.op === "ready") {
				this.delay = RECONNECT_MIN_MS;
				logger.log(
					`Gateway link ready (shard #${this.client.shard?.ids[0] ?? 0})`
				);
			} else if (frame.op === "event" && frame.type === "guild.action") {
				// Independent of config events: never queued behind them.
				void this.handle(frame);
			} else if (frame.op === "event") {
				const previous =
					this.queues.get(frame.guildId) ?? Promise.resolve();
				const next = previous.then(() => this.handle(frame));
				this.queues.set(frame.guildId, next);
				void next.finally(() => {
					if (this.queues.get(frame.guildId) === next)
						this.queues.delete(frame.guildId);
				});
			}
		});

		ws.on("error", () => {});
		ws.on("close", () => {
			if (this.silence) clearTimeout(this.silence);
			this.ws = null;
			this.scheduleReconnect();
		});
	}

	private async handle(event: Protocol.Event): Promise<void> {
		try {
			if (event.type === "guild.action") {
				let data: unknown;
				try {
					data = await runAction(this.client, event);
				} catch (error) {
					this.send({
						op: "ack",
						id: event.id,
						ok: false,
						error: actionErrorMessage(event.action, error)
					});
					return;
				}
				this.send({
					op: "ack",
					id: event.id,
					ok: true,
					data: data ?? null
				});
				return;
			}
			if (event.type !== "guild.config.updated") {
				throw `unknown event type ${(event as Protocol.Event).type}`;
			}
			const results = await applyConfigChanges(this.client, event);
			this.send({
				op: "ack",
				id: event.id,
				ok: results.every((r) => r.ok),
				error: results.find((r) => !r.ok)?.error,
				results
			});
		} catch (error) {
			this.send({
				op: "ack",
				id: event.id,
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
}

// What the dashboard may read of a failed action: our own messages and
// Discord's ("Missing Permissions"), never an internal error.
function actionErrorMessage(action: string, error: unknown): string {
	if (error instanceof ActionError) return error.message;
	if (typeof error === "string") return error;
	if (error instanceof DiscordAPIError)
		return `Discord refused: ${error.message}`;
	logger.err(`Gateway action ${action} failed: ${error}`);
	return "the bot ran into an error";
}

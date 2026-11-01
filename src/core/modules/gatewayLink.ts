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
import logger from "../logger.js";

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

// Persistent WebSocket to HorizonGateway: the dashboard only writes the
// database, the gateway pushes the change here and the bot applies the
// side effects with its own code. One connection per shard, opened by the
// bot (nothing exposed on its side), authenticated with `api.apiToken`.
export class GatewayLink {
	private ws: WebSocket | null = null;
	private delay = RECONNECT_MIN_MS;
	private started = false;

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

	private connect(): void {
		let ws: WebSocket;
		try {
			ws = new WebSocket(this.url());
		} catch (error) {
			logger.err(`Gateway link: invalid gateway URL (${error})`);
			return;
		}
		this.ws = ws;

		ws.on("open", () => {
			this.send({
				op: "hello",
				token: this.client.config.api.apiToken,
				cluster: String(this.client.shard?.ids[0] ?? 0),
				guilds: [...this.client.guilds.cache.keys()]
			});
		});

		ws.on("message", (raw) => {
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
			} else if (frame.op === "event") {
				void this.handle(frame);
			}
		});

		ws.on("error", () => {});
		ws.on("close", () => {
			this.ws = null;
			setTimeout(() => this.connect(), this.delay);
			this.delay = Math.min(this.delay * 2, RECONNECT_MAX_MS);
		});
	}

	private async handle(event: Protocol.Event): Promise<void> {
		try {
			if (event.type !== "guild.config.updated") {
				throw `unknown event type ${event.type}`;
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

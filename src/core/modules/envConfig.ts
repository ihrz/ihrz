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

// Bot configuration, read from the environment (Bun loads `.env` from the
// working directory on its own). Nothing is compiled in: the same bundle or
// standalone binary runs any bot, and `src/files/config.ts` is only a legacy
// fallback (`bun run config:env` migrates it).
//
// Connection settings are URLs, one variable each:
//   LAVALINK_URL  ws://password@host:2333?id=main  (wss / https = secure,
//                 several nodes comma-separated, optional retryAmount and
//                 retryDelay query parameters)
//   DATABASE_URL  sqlite (default) | json | memory
//                 | postgres://user:password@host:5432/database
//                 | ws://login:password@host:port (HorizonDB)
// Special characters inside a URL (`@`, `:`, `/`, `#`...) must be
// percent-encoded.

import path from "node:path";

import { ConfigData, LavalinkNodeOptions } from "../../../types/configDatad.js";

export const LEGACY_CONFIG_PATH = path.join(
	process.cwd(),
	"src",
	"files",
	"config.ts"
);

const DEFAULT_GATEWAY = "https://gateway.ihorizon.org";
const DEFAULT_LAVALINK_PORT = 2333;

const CONSOLE_EMOJIS: ConfigData["console"]["emojis"] = {
	OK: "✅",
	ERROR: "❌",
	HOST: "💻",
	KISA: "👩",
	LOAD: "🔄"
};

type Env = Record<string, string | undefined>;

export class ConfigError extends Error {
	override name = "ConfigError";
}

function text(env: Env, name: string): string {
	return env[name]?.trim() ?? "";
}

function optionalText(env: Env, name: string): string | undefined {
	return text(env, name) || undefined;
}

function bool(env: Env, name: string, fallback: boolean): boolean {
	const value = text(env, name).toLowerCase();

	if (["true", "1", "yes", "on"].includes(value)) return true;
	if (["false", "0", "no", "off"].includes(value)) return false;
	if (!value) return fallback;

	throw new ConfigError(`${name} must be true or false, got "${value}"`);
}

function list(env: Env, name: string): string[] {
	return text(env, name)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function positiveInteger(value: string, label: string): number {
	const number = Number(value);

	if (!Number.isInteger(number) || number < 0) {
		throw new ConfigError(`${label} must be a positive integer`);
	}

	return number;
}

function parseUrl(raw: string, label: string): URL {
	try {
		return new URL(raw);
	} catch {
		throw new ConfigError(`${label} is not a valid URL`);
	}
}

export function parseLavalinkUrl(raw: string): LavalinkNodeOptions {
	const url = parseUrl(raw, "LAVALINK_URL");
	const scheme = url.protocol.slice(0, -1);

	if (!["ws", "wss", "http", "https"].includes(scheme)) {
		throw new ConfigError(
			`LAVALINK_URL must start with ws://, wss://, http:// or https:// (got ${scheme}://)`
		);
	}

	const secure = scheme === "wss" || scheme === "https";
	// `password@host` or `:password@host`: Lavalink has no user name.
	const authorization = decodeURIComponent(url.password || url.username);

	if (!authorization) {
		throw new ConfigError(
			`LAVALINK_URL ${url.host} has no password (ws://password@host:port)`
		);
	}

	const node: LavalinkNodeOptions = {
		id: url.searchParams.get("id") || url.hostname,
		host: url.hostname,
		port: url.port
			? Number(url.port)
			: secure
				? 443
				: DEFAULT_LAVALINK_PORT,
		authorization,
		secure
	};

	const retryAmount = url.searchParams.get("retryAmount");
	const retryDelay = url.searchParams.get("retryDelay");

	if (retryAmount) {
		node.retryAmount = positiveInteger(retryAmount, "retryAmount");
	}
	if (retryDelay) {
		node.retryDelay = positiveInteger(retryDelay, "retryDelay");
	}

	return node;
}

export function parseDatabaseUrl(
	raw: string
): NonNullable<ConfigData["database"]> {
	const value = raw.trim();
	const word = value.toLowerCase().replace(/:(\/\/)?$/, "");

	if (!value || word === "sqlite") return { method: "sqlite" };
	if (word === "json") return { method: "json" };
	if (word === "memory") return { method: "memory" };

	const url = parseUrl(value, "DATABASE_URL");
	const scheme = url.protocol.slice(0, -1);

	if (scheme === "postgres" || scheme === "postgresql") {
		return {
			method: "postgresql",
			mySQL: {
				host: url.hostname,
				port: url.port ? Number(url.port) : 5432,
				user: decodeURIComponent(url.username),
				password: decodeURIComponent(url.password),
				database: decodeURIComponent(url.pathname.slice(1))
			}
		};
	}

	if (scheme === "ws" || scheme === "wss") {
		return { method: "horizondb", horizon_dbUrl: value };
	}

	throw new ConfigError(
		"DATABASE_URL must be sqlite, json, memory, postgres://... or ws://... (HorizonDB)"
	);
}

export function configFromEnv(env: Env): ConfigData {
	const token = text(env, "BOT_TOKEN");

	if (!token) {
		throw new ConfigError(
			"BOT_TOKEN is not set: copy .env.example to .env and fill it in"
		);
	}

	const lastfmApiKey = text(env, "LASTFM_API_KEY");
	const lastfmSharedSecret = text(env, "LASTFM_SHARED_SECRET");

	return {
		discord: {
			token,
			phonePresence: bool(env, "PHONE_PRESENCE", false),
			messageCommandsMention: bool(env, "MESSAGE_COMMANDS_MENTION", true),
			defaultMessageCommandsPrefix: text(env, "DEFAULT_PREFIX") || "?"
		},
		lavalink: {
			nodes: list(env, "LAVALINK_URL").map(parseLavalinkUrl)
		},
		core: {
			devMode: bool(env, "DEV_MODE", false),
			blacklistPictureInEmbed: text(env, "BLACKLIST_PICTURE_URL"),
			guildLogsChannelID: text(env, "GUILD_LOGS_CHANNEL_ID"),
			reportChannelID: text(env, "REPORT_CHANNEL_ID"),
			lavalinkLogsChannelID: optionalText(env, "LAVALINK_LOGS_CHANNEL_ID")
		},
		command: {
			always100: list(env, "ALWAYS_100")
		},
		owners: {
			users: list(env, "OWNERS")
		},
		api: {
			HorizonGateway: text(env, "HORIZON_GATEWAY_URL") || DEFAULT_GATEWAY,
			HorizonGatewayLocal: optionalText(env, "HORIZON_GATEWAY_LOCAL_URL"),
			apiToken: text(env, "HORIZON_API_TOKEN")
		},
		lastfm:
			lastfmApiKey && lastfmSharedSecret
				? { apiKey: lastfmApiKey, sharedSecret: lastfmSharedSecret }
				: undefined,
		console: { emojis: { ...CONSOLE_EMOJIS } },
		database: parseDatabaseUrl(text(env, "DATABASE_URL"))
	};
}

function lavalinkNodeToUrl(node: LavalinkNodeOptions): string {
	const url = new URL(
		`${node.secure ? "wss" : "ws"}://${encodeURIComponent(node.authorization)}@${node.host}:${node.port}`
	);

	if (node.id !== node.host) url.searchParams.set("id", node.id);
	if (node.retryAmount !== undefined) {
		url.searchParams.set("retryAmount", String(node.retryAmount));
	}
	if (node.retryDelay !== undefined) {
		url.searchParams.set("retryDelay", String(node.retryDelay));
	}

	return url.toString().replace(/\/(\?|$)/, "$1");
}

function databaseToUrl(database: ConfigData["database"]): string {
	switch (database?.method) {
		case "postgresql": {
			const sql = database.mySQL;
			return `postgres://${encodeURIComponent(sql?.user ?? "")}:${encodeURIComponent(sql?.password ?? "")}@${sql?.host}:${sql?.port ?? 5432}/${encodeURIComponent(sql?.database ?? "")}`;
		}
		case "horizondb":
			return database.horizon_dbUrl ?? "";
		case "json":
		case "memory":
			return database.method;
		default:
			return "sqlite";
	}
}

// The `.env` lines equivalent to a ConfigData (legacy config.ts migration).
export function configToEnv(config: ConfigData): Record<string, string> {
	return {
		BOT_TOKEN: config.discord.token,
		PHONE_PRESENCE: String(config.discord.phonePresence ?? false),
		MESSAGE_COMMANDS_MENTION: String(
			config.discord.messageCommandsMention ?? true
		),
		DEFAULT_PREFIX: config.discord.defaultMessageCommandsPrefix ?? "?",
		LAVALINK_URL: config.lavalink.nodes.map(lavalinkNodeToUrl).join(","),
		DATABASE_URL: databaseToUrl(config.database),
		DEV_MODE: String(config.core.devMode),
		BLACKLIST_PICTURE_URL: config.core.blacklistPictureInEmbed ?? "",
		GUILD_LOGS_CHANNEL_ID: config.core.guildLogsChannelID ?? "",
		REPORT_CHANNEL_ID: config.core.reportChannelID ?? "",
		LAVALINK_LOGS_CHANNEL_ID: config.core.lavalinkLogsChannelID ?? "",
		OWNERS: config.owners.users.join(","),
		ALWAYS_100: config.command.always100.join(","),
		HORIZON_GATEWAY_URL: config.api.HorizonGateway ?? DEFAULT_GATEWAY,
		HORIZON_GATEWAY_LOCAL_URL: config.api.HorizonGatewayLocal ?? "",
		HORIZON_API_TOKEN: config.api.apiToken ?? "",
		LASTFM_API_KEY: config.lastfm?.apiKey ?? "",
		LASTFM_SHARED_SECRET: config.lastfm?.sharedSecret ?? ""
	};
}

// The configuration of this process. A legacy `src/files/config.ts` still
// wins while it exists, so an update never breaks a running bot.
export async function loadConfig(): Promise<ConfigData> {
	if (await Bun.file(LEGACY_CONFIG_PATH).exists()) {
		// Once per machine: shards carry the SHARDS variable.
		if (!process.env.SHARDS) {
			logger.warn(
				"src/files/config.ts is deprecated: run `bun run config:env` to move it into .env"
			);
		}

		return (await import(LEGACY_CONFIG_PATH)).default as ConfigData;
	}

	return configFromEnv(process.env);
}

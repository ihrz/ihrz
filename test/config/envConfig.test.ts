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

import { describe, expect, test } from "bun:test";

import {
	ConfigError,
	configFromEnv,
	configToEnv,
	parseDatabaseUrl,
	parseLavalinkUrl
} from "../../src/core/modules/envConfig.ts";

describe("LAVALINK_URL", () => {
	test("plain ws node, default port, id from the host", () => {
		expect(parseLavalinkUrl("ws://youshallnotpass@localhost")).toEqual({
			id: "localhost",
			host: "localhost",
			port: 2333,
			authorization: "youshallnotpass",
			secure: false
		});
	});

	test("wss is secure on 443, id and retries from the query", () => {
		expect(
			parseLavalinkUrl(
				"wss://:pw@music.example.org?id=main&retryAmount=5&retryDelay=1000"
			)
		).toEqual({
			id: "main",
			host: "music.example.org",
			port: 443,
			authorization: "pw",
			secure: true,
			retryAmount: 5,
			retryDelay: 1000
		});
	});

	test("percent-encoded password is decoded", () => {
		expect(
			parseLavalinkUrl("https://p%40ss%3Aw%2Fo%23rd@h:8443").authorization
		).toBe("p@ss:w/o#rd");
	});

	test.each([
		["ws://localhost:2333", "no password"],
		["redis://pw@localhost", "ws://"],
		["not a url", "not a valid URL"],
		["ws://pw@h?retryAmount=-1", "positive integer"]
	])("%s is refused", (raw, message) => {
		expect(() => parseLavalinkUrl(raw)).toThrow(message);
	});
});

describe("DATABASE_URL", () => {
	test.each([
		["", "sqlite"],
		["sqlite", "sqlite"],
		["sqlite://", "sqlite"],
		["JSON", "json"],
		["memory", "memory"]
	])("%j is %s", (raw, method) => {
		expect(parseDatabaseUrl(raw)).toEqual({ method } as never);
	});

	test("postgres URL fills the connection fields", () => {
		expect(
			parseDatabaseUrl("postgresql://bot:s3cr%3At@db.local:5433/ihrz")
		).toEqual({
			method: "postgresql",
			mySQL: {
				host: "db.local",
				port: 5433,
				user: "bot",
				password: "s3cr:t",
				database: "ihrz"
			}
		});
	});

	test("ws URL is HorizonDB, kept as written", () => {
		expect(parseDatabaseUrl("ws://login:pw@127.0.0.1:8080")).toEqual({
			method: "horizondb",
			horizon_dbUrl: "ws://login:pw@127.0.0.1:8080"
		});
	});

	test("unknown scheme is refused", () => {
		expect(() => parseDatabaseUrl("mysql://a:b@c/d")).toThrow(ConfigError);
	});
});

describe("configFromEnv", () => {
	test("BOT_TOKEN is required", () => {
		expect(() => configFromEnv({})).toThrow("BOT_TOKEN");
	});

	test("defaults", () => {
		const config = configFromEnv({ BOT_TOKEN: "t" });

		expect(config.discord).toEqual({
			token: "t",
			phonePresence: false,
			messageCommandsMention: true,
			defaultMessageCommandsPrefix: "?"
		});
		expect(config.lavalink.nodes).toEqual([]);
		expect(config.database).toEqual({ method: "sqlite" });
		expect(config.owners.users).toEqual([]);
		expect(config.lastfm).toBeUndefined();
		expect(config.api.HorizonGateway).toBe("https://gateway.ihorizon.org");
	});

	test("lists, booleans and several nodes", () => {
		const config = configFromEnv({
			BOT_TOKEN: "t",
			OWNERS: " 1, 2 ,,3 ",
			DEV_MODE: "yes",
			PHONE_PRESENCE: "0",
			LAVALINK_URL: "ws://a@one:1,wss://b@two"
		});

		expect(config.owners.users).toEqual(["1", "2", "3"]);
		expect(config.core.devMode).toBe(true);
		expect(config.discord.phonePresence).toBe(false);
		expect(config.lavalink.nodes.map((node) => node.id)).toEqual([
			"one",
			"two"
		]);
	});

	test("a typo in a boolean is refused instead of guessed", () => {
		expect(() =>
			configFromEnv({ BOT_TOKEN: "t", DEV_MODE: "ture" })
		).toThrow("DEV_MODE");
	});

	test("configToEnv round-trips", () => {
		const env = {
			BOT_TOKEN: "t",
			OWNERS: "1,2",
			ALWAYS_100: "1x2",
			LAVALINK_URL: "ws://p%40w@h:2333?id=main,wss://x@y?retryAmount=2",
			DATABASE_URL: "postgres://u:p%3A@db:5432/ihrz",
			LASTFM_API_KEY: "k",
			LASTFM_SHARED_SECRET: "s",
			UPTIME_KUMA_URL: "https://u.test/status/main",
			UPTIME_KUMA_API_KEY: "key",
			UPTIME_KUMA_GROUPS: "a,b",
			DEV_MODE: "true"
		};
		const config = configFromEnv(env);

		expect(configFromEnv(configToEnv(config))).toEqual(config);
	});
});

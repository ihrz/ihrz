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

import { expect, test } from "bun:test";

import {
	BEATS_SHOWN,
	buildGroups,
	parseKumaUrl,
	parseUptimeMetrics
} from "../../src/core/modules/uptimeKuma.ts";

const page = {
	publicGroupList: [
		{
			name: "iHorizon",
			monitorList: [
				{ id: 1, name: "Gateway", sendUrl: 1, url: "https://a.test" },
				{ id: 2, name: "Lavalink", sendUrl: 0, url: "https://b.test" }
			]
		},
		{ name: "Other", monitorList: [{ id: 3, name: "Hidden" }] }
	]
};

test("parseKumaUrl splits origin and slug", () => {
	expect(parseKumaUrl("https://u.test/status/main")).toEqual({
		origin: "https://u.test",
		slug: "main"
	});
	expect(() => parseKumaUrl("https://u.test")).toThrow();
});

test("parseUptimeMetrics reads the windows of each monitor", () => {
	const windows = parseUptimeMetrics(
		[
			"# HELP monitor_uptime_ratio x",
			'monitor_uptime_ratio{a="",monitor_id="1",window="1d"} 0.5',
			'monitor_uptime_ratio{a="",monitor_id="1",window="30d"} 0.75',
			'monitor_status{monitor_id="1"} 1'
		].join("\n")
	);

	expect(windows.get("1")).toEqual({ "1d": 0.5, "30d": 0.75 });
});

test("buildGroups filters groups and uses the last heartbeat", () => {
	const groups = buildGroups(
		page,
		{
			heartbeatList: {
				1: [
					{ status: 1, ping: 20 },
					{ status: 0, ping: null }
				],
				2: [{ status: 1, ping: 42 }]
			},
			uptimeList: { "2_24": 0.9 }
		},
		new Map([["1", { "1d": 0.5, "30d": 0.75 }]]),
		["ihorizon"]
	);

	expect(groups.map((group) => group.name)).toEqual(["iHorizon"]);
	const [gateway, lavalink] = groups[0].services;
	expect(gateway.state).toBe("down");
	expect(gateway.ping).toBeNull();
	expect(gateway.url).toBe("https://a.test");
	expect(gateway.uptime30d).toBe(0.75);
	expect(gateway.beats).toHaveLength(BEATS_SHOWN);
	expect(gateway.beats[0]).toBeNull();
	expect(lavalink.ping).toBe(42);
	expect(lavalink.url).toBeNull();
	expect(lavalink.uptime24h).toBe(0.9);
});

test("a monitor without heartbeat is pending", () => {
	const [group] = buildGroups(page, {}, new Map(), []);
	expect(group.services[0].state).toBe("pending");
});

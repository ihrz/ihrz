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

import { axios } from "../functions/axios.ts";
import type { ConfigData } from "../../../types/configDatad.d.ts";

export type ServiceState = "up" | "down" | "pending" | "maintenance";

export interface ServiceBeat {
	state: ServiceState;
	ping: number | null;
}

export interface ServiceView {
	name: string;
	url: string | null;
	state: ServiceState;
	ping: number | null;
	uptime24h: number | null;
	uptime30d: number | null;
	// Oldest first, left-padded with null up to BEATS_SHOWN.
	beats: (ServiceBeat | null)[];
}

export interface ServiceGroup {
	name: string;
	services: ServiceView[];
}

export interface KumaIncident {
	title: string;
	content: string;
}

export interface KumaSnapshot {
	pageUrl: string;
	groups: ServiceGroup[];
	incidents: KumaIncident[];
}

type KumaConfig = NonNullable<ConfigData["uptimeKuma"]>;
type UptimeWindows = Map<string, Record<string, number>>;

interface StatusPagePayload {
	incidents?: { title?: string; content?: string }[];
	incident?: { title?: string; content?: string } | null;
	publicGroupList?: {
		name: string;
		monitorList: {
			id: number;
			name: string;
			sendUrl?: number;
			url?: string;
		}[];
	}[];
}

interface HeartbeatPayload {
	heartbeatList?: Record<string, { status: number; ping: number | null }[]>;
	uptimeList?: Record<string, number>;
}

export const BEATS_SHOWN = 60;

const REQUEST_TIMEOUT = 8000;
const STATES: Record<number, ServiceState> = {
	0: "down",
	1: "up",
	2: "pending",
	3: "maintenance"
};

// "https://status.example.org/status/main" -> origin + "main".
export function parseKumaUrl(url: string): { origin: string; slug: string } {
	const parsed = new URL(url);
	const match = parsed.pathname.match(/^\/status\/([^/]+)\/?$/);
	if (!match) {
		throw new Error(
			"UPTIME_KUMA_URL must be a status page URL (https://host/status/<slug>)"
		);
	}

	return { origin: parsed.origin, slug: match[1] };
}

// Uptime ratios per monitor id and window ("1d", "30d") from /metrics.
export function parseUptimeMetrics(metrics: string): UptimeWindows {
	const windows: UptimeWindows = new Map();

	for (const line of metrics.split("\n")) {
		if (!line.startsWith("monitor_uptime_ratio{")) continue;

		const end = line.lastIndexOf("}");
		const labels = line.slice(0, end);
		const id = labels.match(/monitor_id="(\d+)"/)?.[1];
		const window = labels.match(/window="([^"]+)"/)?.[1];
		const value = Number(line.slice(end + 1));
		if (!id || !window || !Number.isFinite(value)) continue;

		windows.set(id, { ...windows.get(id), [window]: value });
	}

	return windows;
}

export function buildGroups(
	page: StatusPagePayload,
	heartbeats: HeartbeatPayload,
	windows: UptimeWindows,
	onlyGroups: string[]
): ServiceGroup[] {
	const wanted = onlyGroups.map((group) => group.toLowerCase());

	return (page.publicGroupList ?? [])
		.filter(
			(group) =>
				wanted.length === 0 || wanted.includes(group.name.toLowerCase())
		)
		.map((group) => ({
			name: group.name,
			services: group.monitorList.map((monitor) => {
				const id = String(monitor.id);
				const beats: ServiceBeat[] = (
					heartbeats.heartbeatList?.[id] ?? []
				)
					.slice(-BEATS_SHOWN)
					.map((beat) => ({
						state: STATES[beat.status] ?? "pending",
						ping: beat.ping ?? null
					}));
				const last = beats[beats.length - 1];

				return {
					name: monitor.name,
					url: monitor.sendUrl ? (monitor.url ?? null) : null,
					state: last?.state ?? "pending",
					ping: last?.state === "up" ? last.ping : null,
					uptime24h:
						windows.get(id)?.["1d"] ??
						heartbeats.uptimeList?.[`${id}_24`] ??
						null,
					uptime30d: windows.get(id)?.["30d"] ?? null,
					beats: [
						...new Array<null>(BEATS_SHOWN - beats.length).fill(
							null
						),
						...beats
					]
				};
			})
		}))
		.filter((group) => group.services.length > 0);
}

async function fetchMetrics(
	origin: string,
	apiKey: string | undefined
): Promise<UptimeWindows> {
	if (!apiKey) return new Map();

	// The status page still works without them: only the 30 day column is lost.
	try {
		const response = await axios.get<string>(`${origin}/metrics`, {
			timeout: REQUEST_TIMEOUT,
			headers: {
				Authorization: `Basic ${Buffer.from(`:${apiKey}`).toString("base64")}`
			}
		});
		if (response.status === 200) return parseUptimeMetrics(response.data);

		logger.warn(`[UptimeKuma] /metrics answered ${response.status}`);
	} catch (error) {
		logger.warn(`[UptimeKuma] /metrics failed: ${error}`);
	}

	return new Map();
}

// Null when the status page cannot be read: the panel then uses local checks.
export async function fetchKumaSnapshot(
	config: KumaConfig
): Promise<KumaSnapshot | null> {
	try {
		const { origin, slug } = parseKumaUrl(config.url);
		const [page, heartbeats, windows] = await Promise.all([
			axios.get<StatusPagePayload>(`${origin}/api/status-page/${slug}`, {
				timeout: REQUEST_TIMEOUT
			}),
			axios.get<HeartbeatPayload>(
				`${origin}/api/status-page/heartbeat/${slug}`,
				{ timeout: REQUEST_TIMEOUT }
			),
			fetchMetrics(origin, config.apiKey)
		]);

		if (page.status !== 200 || heartbeats.status !== 200) {
			logger.warn(
				`[UptimeKuma] status page answered ${page.status}/${heartbeats.status}`
			);
			return null;
		}

		const groups = buildGroups(
			page.data,
			heartbeats.data,
			windows,
			config.groups
		);
		if (groups.length === 0) {
			logger.warn("[UptimeKuma] no monitor matches UPTIME_KUMA_GROUPS");
			return null;
		}

		const incidents = [
			...(page.data.incidents ?? []),
			...(page.data.incident ? [page.data.incident] : [])
		].map((incident) => ({
			title: incident.title ?? "",
			content: incident.content ?? ""
		}));

		return { pageUrl: config.url, groups, incidents };
	} catch (error) {
		logger.warn(`[UptimeKuma] status page failed: ${error}`);
		return null;
	}
}

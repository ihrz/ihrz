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

import { AuditLogEvent, Guild, GuildAuditLogsEntry } from "discord.js";

// REST audit log lookup used by the logs / utils modules. The protection
// system itself is driven by `guildAuditLogEntryCreate` (protectionEngine).

export const handledAuditLogEntries = new Set<string>();
export const handledAuditLogEntrie_logs = new Set<string>();

export interface GetGuildLogPayload {
	guild: Guild;
	target: string;
	type: "PROTECTION" | "LOGS" | "NONE";
	actionType: AuditLogEvent;
}

const LOG_SETS = {
	PROTECTION: handledAuditLogEntries,
	LOGS: handledAuditLogEntrie_logs,
	NONE: null
} as const;

const AUDIT_LOG_WINDOW_MS = 20_000;
const AUDIT_LOG_FETCH_LIMIT = 40;
// Entries older than the window are never matched again: keep the sets bounded.
const HANDLED_ENTRIES_MAX = 5_000;

function markHandled(set: Set<string>, id: string): void {
	set.add(id);
	if (set.size > HANDLED_ENTRIES_MAX) {
		const oldest = set.values().next().value;
		if (oldest) set.delete(oldest);
	}
}

export async function getLogs(
	payload: GetGuildLogPayload
): Promise<GuildAuditLogsEntry | undefined> {
	const { guild, target, type } = payload;

	const fetchedLogs = await guild.fetchAuditLogs({
		type: payload.actionType,
		limit: AUDIT_LOG_FETCH_LIMIT
	});

	const relevantLog = fetchedLogs.entries.find((entry) => {
		const isTargetMatch = entry.targetId === target;
		const isNotBot = entry.executorId !== client.user?.id;
		const hasExecutor = Boolean(entry.executorId);
		const isRecent =
			entry.createdTimestamp > Date.now() - AUDIT_LOG_WINDOW_MS;

		return isTargetMatch && isNotBot && hasExecutor && isRecent;
	});

	if (!relevantLog) return undefined;

	const logSet = LOG_SETS[type];
	if (logSet?.has(relevantLog.id)) return undefined;
	if (logSet) markHandled(logSet, relevantLog.id);

	return relevantLog;
}

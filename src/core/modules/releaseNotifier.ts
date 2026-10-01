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

import {
	Client,
	AttachmentBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from "discord.js";
import path from "node:path";
import logger from "../logger.js";
import { metasTable } from "../../Events/client/ready.js";
import { LanguageData } from "../../../types/languageData.js";

const V_FILE = path.join(process.cwd(), "v.txt");
const V_OLD_FILE = path.join(process.cwd(), "v.old.txt");

const DM_STAGGER_MS = 10000;
const DM_BATCH_SIZE = 1;
const DM_BATCH_DELAY_MS = 15000;

// Anti-spam guards: a past incident caused thousands of DMs in a short time
// and a Discord sanction. Never burst, never double-send, abort on rate-limit.
const LOCK_TTL_MS = 5 * 60 * 1000;
const LOCK_HEARTBEAT_MS = 60 * 1000;
const MAX_CONSECUTIVE_TRANSIENT_ERRORS = 5;
const TRANSIENT_BACKOFF_MS = 60_000;

// broadcastEval throws ShardingInProcess when shard 0 is ready but the
// other shards are still spawning (spawn delay is 5.5s per shard).
// Retry instead of failing the whole newsletter run.
const SHARD_READY_MAX_RETRIES = 40;
const SHARD_READY_RETRY_MS = 15_000;

// In-process re-entrance guard (double ready event must not start two loops).
let isRunning = false;

interface NewsletterLock {
	owner?: string;
	version?: string;
	startedAt?: number;
	updatedAt?: number;
	finished?: boolean;
	sent?: number;
	failed?: number;
	skipped?: number;
	transient?: number;
	totalOwners?: number;
	remainingAtEnd?: number;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEta(ms: number): string {
	if (ms <= 0) return "0s";
	const totalSec = Math.ceil(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (h > 0) return `${h}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
	if (m > 0) return `${m}m${String(s).padStart(2, "0")}s`;
	return `${s}s`;
}

function estimateRemainingMs(remainingOwners: number): number {
	if (remainingOwners <= 0) return 0;
	const remainingBatches = Math.ceil(remainingOwners / DM_BATCH_SIZE);
	return (
		remainingOwners * DM_STAGGER_MS +
		Math.max(0, remainingBatches - 1) * DM_BATCH_DELAY_MS
	);
}

interface GuildOwnerEntry {
	guildId: string;
	ownerId: string;
}

function isValidVersion(version: string): boolean {
	const parts = version.split(".");
	return parts.length >= 2 && parts.every((p) => /^\d+$/.test(p));
}

export async function writeVersionFile(version: string): Promise<void> {
	try {
		const oldFile = Bun.file(V_FILE);
		if (await oldFile.exists()) {
			const oldContent = await oldFile.text();
			if (oldContent.trim()) {
				await Bun.write(V_OLD_FILE, oldContent.trim());
			}
		}
		await Bun.write(V_FILE, version);
		logger.log("Version file written: " + version);
	} catch (err) {
		logger.err("Failed to write version file: " + String(err));
	}
}

async function readVersionFile(filepath: string): Promise<string | null> {
	try {
		const file = Bun.file(filepath);
		if (!(await file.exists())) return null;
		return (await file.text()).trim() || null;
	} catch {
		return null;
	}
}

function getPdfPath(version: string, lang: string): string {
	return path.join(
		process.cwd(),
		"changelogs",
		lang,
		version,
		`CHANGELOG_${lang.toUpperCase()}_${version}.pdf`
	);
}

type DmOutcome = "sent" | "blocked" | "transient";

interface DmResult {
	outcome: DmOutcome;
	code?: string | number;
	retryAfterMs?: number;
}

function classifyDmError(err: any): DmResult {
	const code = err?.code ?? err?.rawError?.code;
	const status = err?.status ?? err?.httpStatus;

	// Permanent: DMs closed, bot blocked, unknown user. Never retry (per version).
	if (
		code === 50007 ||
		code === 50013 ||
		code === 10013 ||
		status === 403 ||
		status === 404
	) {
		return { outcome: "blocked", code: code ?? status };
	}

	let retryAfterMs = TRANSIENT_BACKOFF_MS;
	const retryAfterSec = Number(err?.retryAfter ?? err?.rawError?.retry_after);
	if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
		retryAfterMs = Math.min(
			Math.max(retryAfterSec * 1000, 30_000),
			10 * 60_000
		);
	}
	return { outcome: "transient", code: code ?? status, retryAfterMs };
}

async function sendDm(
	client: Client,
	ownerId: string,
	guildId: string,
	version: string,
	releaseUrl: string,
	lang: LanguageData,
	pdf: { name: string; data: Buffer } | null
): Promise<DmResult> {
	try {
		let user;
		try {
			user = await client.users.fetch(ownerId);
		} catch (err) {
			const classified = classifyDmError(err);
			if (classified.outcome === "blocked") {
				return {
					outcome: "blocked",
					code: classified.code ?? "unknown-user"
				};
			}
			// Transient fetch failure (network, 5xx): let the caller
			// release the claim so this owner is retried later.
			return classified;
		}
		if (!user) return { outcome: "blocked", code: "unknown-user" };

		const files: any[] = [];
		if (pdf) {
			files.push(new AttachmentBuilder(pdf.data, { name: pdf.name }));
		}

		const body = lang.newsletter_dm_body
			.replace("{owner}", user.username)
			.replace("{version}", version)
			.replace("{releaseUrl}", `<${releaseUrl}>`);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`newsletter-toggle%${guildId}?dm`)
				.setLabel(lang.newsletter_btn_unsubscribe)
				.setStyle(ButtonStyle.Danger)
		);

		await user.send({
			content: body,
			components: [row],
			files
		});

		return { outcome: "sent" };
	} catch (err) {
		return classifyDmError(err);
	}
}

async function getOwnerLang(
	client: Client,
	guildId: string
): Promise<LanguageData> {
	if (!guildId) {
		return client.func.getLanguageData(null);
	}
	return client.func.getLanguageData(guildId);
}

async function getAllGuildOwnerData(
	client: Client
): Promise<GuildOwnerEntry[]> {
	if (!client.shard) {
		return [...client.guilds.cache.values()]
			.filter((g) => g.ownerId)
			.map((g) => ({ guildId: g.id, ownerId: g.ownerId! }));
	}

	for (let attempt = 1; ; attempt++) {
		try {
			const results = await client.shard.broadcastEval((c) =>
				[...c.guilds.cache.values()]
					.filter((g) => g.ownerId)
					.map((g) => ({ guildId: g.id, ownerId: g.ownerId! }))
			);

			return results.flat();
		} catch (err: any) {
			const isShardingInProcess =
				err?.name?.includes("ShardingInProcess") ||
				String(err?.message ?? err).includes(
					"still being spawned"
				);
			if (!isShardingInProcess || attempt > SHARD_READY_MAX_RETRIES) {
				throw err;
			}
			logger.log(
				"Release notifier [waiting-shards]: attempt " +
					attempt +
					"/" +
					SHARD_READY_MAX_RETRIES +
					", shards still spawning, retrying in " +
					Math.round(SHARD_READY_RETRY_MS / 1000) +
					"s"
			);
			await sleep(SHARD_READY_RETRY_MS);
		}
	}
}

export async function checkAndNotifyRelease(client: Client): Promise<void> {
	if (!client.isMainShard()) {
		return;
	}

	if (isRunning) {
		logger.log(
			"Release notifier: already running, skipping duplicate trigger"
		);
		return;
	}
	isRunning = true;

	const processId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	let heartbeat: ReturnType<typeof setInterval> | null = null;
	const progress = { sent: 0, failed: 0, skipped: 0, transient: 0 };

	try {
		const currentVersion = await readVersionFile(V_FILE);
		if (!currentVersion) {
			logger.log("Release notifier: no v.txt found, skipping");
			return;
		}

		if (!isValidVersion(currentVersion)) {
			logger.log(
				"Release notifier: skipping, version " +
					currentVersion +
					" is not a valid version format"
			);
			return;
		}

		const versionKey = currentVersion.replace(/\./g, "-");
		const lockKey = `newsletter_lock_${versionKey}`;
		const legacySentKey = `newsletter_sent_${versionKey}`;
		const claimKeyOf = (id: string) =>
			`newsletter_claim_${versionKey}.${id}`;
		const failKeyOf = (id: string) => `newsletter_fail_${versionKey}.${id}`;

		const previousVersion = await readVersionFile(V_OLD_FILE);
		if (previousVersion && currentVersion === previousVersion) {
			const lock = (await metasTable.get(
				lockKey
			)) as NewsletterLock | null;
			if (lock?.finished && (lock.remainingAtEnd ?? -1) === 0) {
				logger.log(
					"Release notifier: same version " +
						currentVersion +
						", already completed, skipping"
				);
				return;
			}
			logger.log(
				"Release notifier: same version " +
					currentVersion +
					", resuming unfinished run"
			);
		}

		const releaseUrl = `${client.version.git_remote}/-/releases/${currentVersion}`;

		logger.log(
			"Release notifier: processing release " +
				currentVersion +
				" (was " +
				(previousVersion || "none") +
				")"
		);

		const allGuildData = await getAllGuildOwnerData(client);

		const ownerIds = new Set<string>();
		const guildIdByOwner = new Map<string, string>();

		for (const { guildId, ownerId } of allGuildData) {
			ownerIds.add(ownerId);
			if (!guildIdByOwner.has(ownerId)) {
				guildIdByOwner.set(ownerId, guildId);
			}
		}

		// Legacy compat: runs started before per-owner claim keys used one map.
		const legacySent = (await metasTable.get(legacySentKey)) as Record<
			string,
			boolean
		> | null;

		const ownerArray: string[] = [];
		for (const ownerId of ownerIds) {
			if (legacySent?.[ownerId]) {
				progress.skipped++;
				continue;
			}
			if (await metasTable.has(claimKeyOf(ownerId))) {
				progress.skipped++;
				continue;
			}
			if (await metasTable.has(failKeyOf(ownerId))) {
				progress.skipped++;
				continue;
			}
			ownerArray.push(ownerId);
		}

		// Deterministic order: stable resume across reboots, easier log reading.
		ownerArray.sort();

		logger.debug(
			"Release notifier [sorted]: " +
				ownerArray.length +
				" DMs sorted (" +
				allGuildData.length +
				" guilds, " +
				ownerIds.size +
				" unique owners, " +
				progress.skipped +
				" skipped), ETA: " +
				formatEta(estimateRemainingMs(ownerArray.length))
		);

		const runStartedAt = Date.now();

		if (ownerArray.length === 0) {
			logger.log(
				"Release notifier: all " +
					ownerIds.size +
					" owners already notified for " +
					currentVersion
			);
			const existing = (await metasTable.get(
				lockKey
			)) as NewsletterLock | null;
			if (
				!existing ||
				existing.finished ||
				Date.now() - (existing.updatedAt ?? 0) >= LOCK_TTL_MS
			) {
				await metasTable.set(lockKey, {
					owner: processId,
					version: currentVersion,
					startedAt: existing?.startedAt ?? runStartedAt,
					updatedAt: Date.now(),
					finished: true,
					remainingAtEnd: 0,
					totalOwners: ownerIds.size
				});
			} else {
				logger.log(
					"Release notifier: another runner is active for " +
						currentVersion +
						", keeping its lock"
				);
			}
			return;
		}

		// Distributed lock: only one shard-0 process may run a version.
		// A stale lock (no heartbeat within TTL) means the holder died.
		const existingLock = (await metasTable.get(
			lockKey
		)) as NewsletterLock | null;
		if (
			existingLock &&
			!existingLock.finished &&
			runStartedAt - (existingLock.updatedAt ?? 0) < LOCK_TTL_MS &&
			existingLock.owner !== processId
		) {
			logger.log(
				"Release notifier: another runner is active for " +
					currentVersion +
					", skipping"
			);
			return;
		}
		await metasTable.set(lockKey, {
			owner: processId,
			version: currentVersion,
			startedAt: existingLock?.startedAt ?? runStartedAt,
			updatedAt: runStartedAt,
			finished: false
		});
		heartbeat = setInterval(() => {
			metasTable
				.get(lockKey)
				.then((current: any) => {
					if (current?.owner === processId && !current?.finished) {
						return metasTable.set(lockKey, {
							...current,
							updatedAt: Date.now(),
							...progress
						});
					}
				})
				.catch(() => {});
		}, LOCK_HEARTBEAT_MS);

		// Load changelog PDFs once instead of reading disk on every DM.
		const pdfCache = new Map<string, { name: string; data: Buffer }>();
		for (const pdfLang of ["fr", "en"]) {
			const pdfPath = getPdfPath(currentVersion, pdfLang);
			if (await Bun.file(pdfPath).exists()) {
				pdfCache.set(pdfLang, {
					name: `CHANGELOG_${currentVersion}.pdf`,
					data: Buffer.from(await Bun.file(pdfPath).arrayBuffer())
				});
			}
		}

		let consecutiveTransient = 0;
		let aborted = false;
		let processed = 0;

		for (let i = 0; i < ownerArray.length; i += DM_BATCH_SIZE) {
			const batch = ownerArray.slice(i, i + DM_BATCH_SIZE);

			logger.debug(
				"Release notifier [entered]: batch " +
					(Math.floor(i / DM_BATCH_SIZE) + 1) +
					"/" +
					Math.ceil(ownerArray.length / DM_BATCH_SIZE) +
					" (" +
					batch.length +
					" DMs), processed " +
					processed +
					"/" +
					ownerArray.length +
					", ETA: " +
					formatEta(
						estimateRemainingMs(ownerArray.length - processed)
					)
			);

			for (const ownerId of batch) {
				processed++;

				logger.debug(
					"Release notifier [entered]: DM " +
						ownerId +
						" (" +
						processed +
						"/" +
						ownerArray.length +
						"), sent " +
						progress.sent +
						", failed " +
						progress.failed +
						", skipped " +
						progress.skipped +
						", ETA: " +
						formatEta(
							estimateRemainingMs(
								ownerArray.length - processed + 1
							)
						)
				);

				if (await metasTable.has(claimKeyOf(ownerId))) {
					progress.skipped++;
					continue;
				}
				if (await metasTable.has(failKeyOf(ownerId))) {
					progress.skipped++;
					continue;
				}

				// Check newsletter blacklist (fresh read: unsubscribes mid-run apply immediately)
				const bl = (await metasTable.get("newsletter_bl")) as Record<
					string,
					boolean
				> | null;
				if (bl?.[ownerId] === true) {
					progress.skipped++;
					continue;
				}

				const guildId = guildIdByOwner.get(ownerId) ?? "";
				const lang = await getOwnerLang(client, guildId);
				const pdfLang = (lang as any)?._code?.startsWith("fr")
					? "fr"
					: "en";
				const pdf =
					pdfCache.get(pdfLang) ??
					pdfCache.get(pdfLang === "fr" ? "en" : "fr") ??
					null;

				// Claim BEFORE sending: a crash here skips one owner
				// instead of double-sending a DM on reboot.
				await metasTable.set(claimKeyOf(ownerId), true);

				const result = await sendDm(
					client,
					ownerId,
					guildId,
					currentVersion,
					releaseUrl,
					lang,
					pdf
				);

				if (result.outcome === "sent") {
					progress.sent++;
					consecutiveTransient = 0;
					logger.debug(
						"Release notifier: DM " +
							ownerId +
							" sent (" +
							processed +
							"/" +
							ownerArray.length +
							"), ETA: " +
							formatEta(
								estimateRemainingMs(
									ownerArray.length - processed
								)
							)
					);
				} else if (result.outcome === "blocked") {
					// Permanent (DMs closed, bot blocked, unknown user): never retry this version.
					progress.failed++;
					consecutiveTransient = 0;
					logger.debug(
						"Release notifier: DM " +
							ownerId +
							" blocked (" +
							String(result.code) +
							") (" +
							processed +
							"/" +
							ownerArray.length +
							"), ETA: " +
							formatEta(
								estimateRemainingMs(
									ownerArray.length - processed
								)
							)
					);
					await metasTable.set(failKeyOf(ownerId), {
						code: result.code ?? "blocked",
						at: Date.now()
					});
				} else {
					// Transient (429, 5xx, network): release the claim so a
					// later boot retries, back off, abort if Discord struggles.
					progress.transient++;
					consecutiveTransient++;
					await metasTable
						.delete(claimKeyOf(ownerId))
						.catch(() => {});
					logger.warn(
						"Release notifier: transient error for " +
							ownerId +
							" (" +
							String(result.code) +
							"), backing off"
					);
					await sleep(result.retryAfterMs ?? TRANSIENT_BACKOFF_MS);
					if (
						consecutiveTransient >= MAX_CONSECUTIVE_TRANSIENT_ERRORS
					) {
						logger.err(
							"Release notifier: too many consecutive transient errors, aborting run"
						);
						aborted = true;
						break;
					}
					continue;
				}

				await sleep(DM_STAGGER_MS);
			}

			if (aborted) break;

			if (i + DM_BATCH_SIZE < ownerArray.length) {
				await sleep(DM_BATCH_DELAY_MS);
			}
		}

		const remainingAtEnd =
			ownerArray.length - processed + progress.transient;
		const doneLock = (await metasTable.get(
			lockKey
		)) as NewsletterLock | null;
		if (doneLock?.owner === processId) {
			await metasTable.set(lockKey, {
				...doneLock,
				updatedAt: Date.now(),
				finished: true,
				...progress,
				totalOwners: ownerIds.size,
				remainingAtEnd
			});
		}

		logger.log(
			"Release notifier: sent " +
				progress.sent +
				" DMs, " +
				progress.failed +
				" blocked, " +
				progress.transient +
				" transient, " +
				progress.skipped +
				" skipped (total owners: " +
				ownerIds.size +
				")" +
				(aborted ? " [ABORTED]" : "")
		);
		logger.debug(
			"Release notifier [finished]: " +
				progress.sent +
				" sent, " +
				progress.failed +
				" blocked, " +
				progress.transient +
				" transient, " +
				progress.skipped +
				" skipped, processed " +
				processed +
				"/" +
				ownerArray.length +
				" in " +
				formatEta(Date.now() - runStartedAt) +
				", ETA: " +
				formatEta(estimateRemainingMs(remainingAtEnd)) +
				(aborted ? " [ABORTED]" : "")
		);
	} finally {
		if (heartbeat) clearInterval(heartbeat);
		isRunning = false;
	}
}

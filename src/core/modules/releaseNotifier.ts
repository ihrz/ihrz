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

async function sendDm(
	client: Client,
	ownerId: string,
	guildId: string,
	version: string,
	releaseUrl: string,
	lang: LanguageData
): Promise<boolean> {
	try {
		const user = await client.users.fetch(ownerId).catch(() => null);
		if (!user) return false;

		const pdfLang = (lang as any)?._code?.startsWith("fr") ? "fr" : "en";

		let finalPdfPath = getPdfPath(version, pdfLang);
		if (!(await Bun.file(finalPdfPath).exists())) {
			const fallbackLang = pdfLang === "fr" ? "en" : "fr";
			const fallbackPath = getPdfPath(version, fallbackLang);
			if (await Bun.file(fallbackPath).exists()) {
				finalPdfPath = fallbackPath;
			} else {
				finalPdfPath = "";
			}
		}

		const files: any[] = [];
		if (finalPdfPath) {
			const pdfBuffer = Buffer.from(
				await Bun.file(finalPdfPath).arrayBuffer()
			);
			files.push(
				new AttachmentBuilder(pdfBuffer, {
					name: `CHANGELOG_${version}.pdf`
				})
			);
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

		return true;
	} catch {
		return false;
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

	const results = await client.shard.broadcastEval((c) =>
		[...c.guilds.cache.values()]
			.filter((g) => g.ownerId)
			.map((g) => ({ guildId: g.id, ownerId: g.ownerId! }))
	);

	return results.flat();
}

export async function checkAndNotifyRelease(client: Client): Promise<void> {
	if (!client.isMainShard()) {
		return;
	}

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

	const previousVersion = await readVersionFile(V_OLD_FILE);
	if (previousVersion && currentVersion === previousVersion) {
		logger.log(
			"Release notifier: same version " + currentVersion + ", skipping"
		);
		return;
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

	const alreadySentKey = `newsletter_sent_${currentVersion.replace(/\./g, "-")}`;
	const initialSent = (await metasTable.get(alreadySentKey)) as Record<
		string,
		boolean
	> | null;

	let sent = 0;
	let failed = 0;
	let skipped = 0;
	const ownerArray = [...ownerIds].filter((id) => !initialSent?.[id]);

	if (ownerArray.length === 0) {
		logger.log(
			"Release notifier: all " +
				ownerIds.size +
				" owners already notified for " +
				currentVersion
		);
		return;
	}

	for (let i = 0; i < ownerArray.length; i += DM_BATCH_SIZE) {
		const batch = ownerArray.slice(i, i + DM_BATCH_SIZE);

		for (const ownerId of batch) {
			// Re-read to catch owners already processed by another shard
			const freshSent = (await metasTable.get(alreadySentKey)) as Record<
				string,
				boolean
			> | null;
			if (freshSent?.[ownerId]) {
				skipped++;
				continue;
			}

			// Check newsletter blacklist
			const bl = (await metasTable.get("newsletter_bl")) as Record<
				string,
				boolean
			> | null;
			if (bl?.[ownerId] === true) {
				skipped++;
				continue;
			}

			const guildId = guildIdByOwner.get(ownerId) ?? "";
			const lang = await getOwnerLang(client, guildId);

			const result = await sendDm(
				client,
				ownerId,
				guildId,
				currentVersion,
				releaseUrl,
				lang
			);

			if (result) {
				sent++;
				// Re-read fresh to avoid overwriting other shards' writes
				const current = (await metasTable.get(
					alreadySentKey
				)) as Record<string, boolean> | null;
				await metasTable.set(alreadySentKey, {
					...current,
					[ownerId]: true
				});
			} else {
				failed++;
			}

			await new Promise((r) => setTimeout(r, DM_STAGGER_MS));
		}

		if (i + DM_BATCH_SIZE < ownerArray.length) {
			await new Promise((r) => setTimeout(r, DM_BATCH_DELAY_MS));
		}
	}

	logger.log(
		"Release notifier: sent " +
			sent +
			" DMs, " +
			failed +
			" failed, " +
			skipped +
			" skipped (total owners: " +
			ownerArray.length +
			")"
	);
}

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

const DM_RATE_LIMIT_MS = 5000;
const DM_BATCH_SIZE = 4;
const DM_BATCH_DELAY_MS = 60000;

function isMinorRelease(version: string): boolean {
	const parts = version.split(".");
	return parts.length >= 2;
}

function getMinorKey(version: string): string {
	const parts = version.split(".");
	return parts[0] + "." + parts[1];
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
	ownerId: string
): Promise<LanguageData> {
	for (const [, guild] of client.guilds.cache) {
		if (guild.ownerId === ownerId) {
			return client.func.getLanguageData(guild.id);
		}
	}
	return client.func.getLanguageData(null);
}

export async function checkAndNotifyRelease(client: Client): Promise<void> {
	if (typeof client.isMainShard === "function" && !client.isMainShard())
		return;

	const currentVersion = await readVersionFile(V_FILE);
	if (!currentVersion) {
		logger.log("Release notifier: no v.txt found, skipping");
		return;
	}

	if (!isMinorRelease(currentVersion)) {
		logger.log(
			"Release notifier: skipping, version " +
				currentVersion +
				" is a patch, not a minor release"
		);
		return;
	}

	const previousVersion = await readVersionFile(V_OLD_FILE);
	if (previousVersion) {
		const currentMinor = getMinorKey(currentVersion);
		const previousMinor = getMinorKey(previousVersion);
		if (currentMinor === previousMinor) {
			logger.log(
				"Release notifier: same minor version " +
					currentMinor +
					", skipping"
			);
			return;
		}
	}

	const releaseUrl = `${client.version.git_remote}/-/releases/${currentVersion}`;

	logger.log(
		"Release notifier: processing minor release " +
			currentVersion +
			" (was " +
			(previousVersion || "none") +
			")"
	);

	const guilds = [...client.guilds.cache.values()];
	const ownerIds = new Set<string>();

	for (const guild of guilds) {
		if (!guild.ownerId) continue;
		ownerIds.add(guild.ownerId);
	}

	let sent = 0;
	let failed = 0;
	let skipped = 0;
	const ownerArray = [...ownerIds];

	for (let i = 0; i < ownerArray.length; i += DM_BATCH_SIZE) {
		const batch = ownerArray.slice(i, i + DM_BATCH_SIZE);

		const results = await Promise.all(
			batch.map(async (ownerId) => {
				await new Promise((r) => setTimeout(r, DM_RATE_LIMIT_MS));

				const lang = await getOwnerLang(client, ownerId);

				let guildId = "";

				for (const [, g] of client.guilds.cache) {
					if (g.ownerId === ownerId) {
						guildId = g.id;
						const bl = (await metasTable.get(
							"newsletter_bl"
						)) as Record<string, boolean> | null;
						if (bl?.[ownerId] === true) {
							return "skipped";
						}
						break;
					}
				}

				const result = await sendDm(
					client,
					ownerId,
					guildId,
					currentVersion,
					releaseUrl,
					lang
				);
				return result ? "sent" : "failed";
			})
		);

		for (const result of results) {
			if (result === "sent") sent++;
			else if (result === "skipped") skipped++;
			else failed++;
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

	writeVersionFile(currentVersion);
}

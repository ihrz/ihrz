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

// Generates the release changelog PDFs attached to the newsletter DMs.
// Usage: bun run tools/ChangelogPdf.ts [version]  (defaults to package.json version)
// Reads CHANGELOG.md + CHANGELOG_FR.md, writes:
//   changelogs/en/<version>/CHANGELOG_EN_<version>.pdf
//   changelogs/fr/<version>/CHANGELOG_FR_<version>.pdf
// (exact names required by getPdfPath() in src/core/modules/releaseNotifier.ts)

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { launch } from "puppeteer";
import logger from "../src/core/logger.js";
import pkg from "../package.json";

const version = process.argv[2] ?? (pkg as { version: string }).version;

function escapeHtml(source: string): string {
	return source
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function inline(source: string): string {
	const out = escapeHtml(source);
	return out
		.replaceAll(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replaceAll(/`(.+?)`/g, "<code>$1</code>");
}

function markdownToHtml(markdown: string): string {
	let html = "";
	let inList = false;
	const closeList = () => {
		if (inList) {
			html += "</ul>";
			inList = false;
		}
	};
	for (const line of markdown.split("\n")) {
		if (line.startsWith("# ")) {
			closeList();
			html += `<h1>${inline(line.slice(2))}</h1>`;
		} else if (line.startsWith("## ")) {
			closeList();
			html += `<h2>${inline(line.slice(3))}</h2>`;
		} else if (line.trim() === "---") {
			closeList();
			html += "<hr>";
		} else if (line.startsWith("- ")) {
			if (!inList) {
				html += "<ul>";
				inList = true;
			}
			html += `<li>${inline(line.slice(2))}</li>`;
		} else if (line.trim() === "") {
			closeList();
		} else {
			closeList();
			html += `<p>${inline(line)}</p>`;
		}
	}
	closeList();
	return html;
}

function pageHtml(title: string, body: string): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: "Noto Sans", "Liberation Sans", sans-serif; color: #1a1a1a; line-height: 1.55; font-size: 13px; }
  h1 { font-size: 22px; color: #232a3a; border-bottom: 3px solid #475387; padding-bottom: 8px; }
  h2 { font-size: 16px; color: #475387; margin-top: 22px; }
  hr { border: none; border-top: 1px solid #d5d9e2; margin: 18px 0; }
  ul { padding-left: 22px; }
  li { margin: 4px 0; }
  code { background: #eef0f5; border-radius: 4px; padding: 1px 5px; font-size: 12px; }
  p { margin: 8px 0; }
</style></head><body>${body}</body></html>`;
}

function resolveChromiumPath(): string | undefined {
	const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
	if (fromEnv && existsSync(fromEnv)) return fromEnv;

	// The repo puppeteer config may point to a missing /nix chromium:
	// fall back to the newest cached chrome-headless-shell instead.
	const cacheDir = path.join(
		os.homedir(),
		".cache",
		"puppeteer",
		"chrome-headless-shell"
	);
	if (!existsSync(cacheDir)) return undefined;
	const versions = readdirSync(cacheDir)
		.filter((entry) => entry.startsWith("linux-"))
		.sort()
		.reverse();
	for (const entry of versions) {
		const candidate = path.join(
			cacheDir,
			entry,
			"chrome-headless-shell-linux64",
			"chrome-headless-shell"
		);
		if (existsSync(candidate)) return candidate;
	}
	return undefined;
}

const targets = [
	{
		markdownFile: path.join(process.cwd(), "CHANGELOG.md"),
		outputFile: path.join(
			process.cwd(),
			"changelogs",
			"en",
			version,
			`CHANGELOG_EN_${version}.pdf`
		)
	},
	{
		markdownFile: path.join(process.cwd(), "CHANGELOG_FR.md"),
		outputFile: path.join(
			process.cwd(),
			"changelogs",
			"fr",
			version,
			`CHANGELOG_FR_${version}.pdf`
		)
	}
];

const executablePath = resolveChromiumPath();
const browser = await launch({
	args: ["--no-sandbox", "--disable-setuid-sandbox"],
	...(executablePath ? { executablePath } : {})
});
try {
	for (const target of targets) {
		const markdown = await Bun.file(target.markdownFile).text();
		mkdirSync(path.dirname(target.outputFile), { recursive: true });
		const page = await browser.newPage();
		await page.setContent(
			pageHtml(`iHorizon ${version}`, markdownToHtml(markdown)),
			{ waitUntil: "load" }
		);
		await page.pdf({
			path: target.outputFile,
			format: "A4",
			printBackground: true,
			margin: { top: "18mm", bottom: "18mm", left: "15mm", right: "15mm" }
		});
		await page.close();
		logger.log(
			`Changelog PDF written: ${target.outputFile} (${Bun.file(target.outputFile).size} bytes)`
		);
	}
} finally {
	await browser.close();
}

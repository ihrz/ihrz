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

/*			This code are taked from:

	https://github.com/diogoscf/github-lines/

			Original author: diogoscf
			Repositories Licence: MIT			*/

import { Message } from "discord.js";
import { LanguageData } from "../../../types/languageData";
import { readCapped } from "../svg/remoteImage.js";

/*
 * Any member can post links: every download is bounded in count, size and
 * time so a message full of huge files cannot exhaust the shard memory.
 */
const MAX_LINKS_PER_MESSAGE = 5;
const MAX_FILE_BYTES = 1024 * 1024;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_DISPLAYED_LINES = 50;

export class LineData {
	readonly lineLength: number;
	readonly extension: string;
	readonly toDisplay: string;

	constructor(lineLength: number, extension: string, toDisplay: string) {
		this.lineLength = lineLength;
		this.extension = extension;
		this.toDisplay = toDisplay;
	}
}

export interface IMessageData {
	msgList: LineData[];
	totalLines: number;
}

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

class GithubLinesManager {
	readonly GITHUB_TOKEN: string | undefined;
	readonly authHeaders: Record<string, string>;

	constructor(token: string | undefined) {
		this.GITHUB_TOKEN = token;
		this.authHeaders = {};
		if (this.GITHUB_TOKEN) {
			this.authHeaders.Authorization = `token ${this.GITHUB_TOKEN}`;
		}
	}

	private async fetchText(
		url: string,
		headers?: Record<string, string>
	): Promise<string | null> {
		const resp = await fetch(url, {
			headers,
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		}).catch(() => null);
		if (!resp?.ok) {
			await resp?.body?.cancel().catch(() => {});
			return null;
		}
		const body = await readCapped(resp, MAX_FILE_BYTES).catch(() => null);
		return body ? body.toString("utf8") : null;
	}

	static formatIndent(str: string): string {
		const lines = str.replace(/\t/g, "    ").split("\n");
		const ignored: number[] = [];
		let minSpaces = Infinity;
		const newLines: string[] = [];

		lines.forEach((line, idx) => {
			const leadingSpaces = line.search(/\S/);
			if (leadingSpaces === -1) {
				ignored.push(idx);
			} else if (leadingSpaces < minSpaces) {
				minSpaces = leadingSpaces;
			}
		});

		lines.forEach((line, idx) => {
			newLines.push(
				ignored.includes(idx) ? line : line.substring(minSpaces)
			);
		});

		return newLines.join("\n");
	}

	async handleMatch(
		match: RegExpMatchArray,
		type: string
	): Promise<LineData | null> {
		let lines: string[];
		let filename = match[3];

		// Refuse a span that would be rejected anyway, before downloading.
		const requestedStart = parseInt(match[4], 10);
		const requestedEnd = match[5] ? parseInt(match[5], 10) : requestedStart;
		if (Math.abs(requestedEnd - requestedStart) >= MAX_DISPLAYED_LINES) {
			return null;
		}

		if (type === "GitHub") {
			const text = await this.fetchText(
				`https://raw.githubusercontent.com/${match[1]}/${match[2]}/${filename}`
			);
			if (text === null) return null;
			lines = text.split("\n");
		} else if (type === "GitLab") {
			const text = await this.fetchText(
				`https://gitlab.com/${match[1]}/-/raw/${match[2]}/${filename}`
			);
			if (text === null) return null;
			lines = text.split("\n");
		} else if (type === "Gist") {
			const dotFilename = filename.replace(/-([^-]*)$/, ".$1");
			let text: string | null = null;

			if (match[2].length) {
				text = await this.fetchText(
					`https://gist.githubusercontent.com/${match[1]}/raw/${match[2]}/${dotFilename}`
				);
				if (text === null) return null;
			} else {
				const raw = await this.fetchText(
					`https://api.github.com/gists/${match[1].split("/")[1]}`,
					this.authHeaders
				);
				if (raw === null) return null;

				let json: JSONObject;
				try {
					json = JSON.parse(raw) as JSONObject;
				} catch {
					return null;
				}
				if (
					!("files" in json) ||
					typeof json.files !== "object" ||
					json.files === null
				)
					return null;

				const files = json.files as Record<string, any>;
				text =
					files[dotFilename]?.content ||
					files[
						Object.keys(files).find(
							(key) =>
								key.toLowerCase().replace(/\W+/g, "-") ===
								filename.toLowerCase()
						) || ""
					]?.content;

				if (!text) return null;
			}

			filename = dotFilename;
			lines = text.split("\n");
		} else {
			return null;
		}

		let toDisplay: string;
		let lineLength: number;

		const lineStart = parseInt(match[4], 10);
		const lineEnd = match[5] ? parseInt(match[5], 10) : lineStart;

		if (lineStart > lines.length || lineStart === 0) return null;

		if (!match[5].length || lineStart === lineEnd) {
			toDisplay = lines[lineStart - 1].trim().replace(/``/g, "`\u200b`");
			lineLength = 1;
		} else {
			let start = Math.max(1, Math.min(lineStart, lineEnd));
			let end = Math.min(lines.length, Math.max(lineStart, lineEnd));
			lineLength = end - start + 1;
			toDisplay = GithubLinesManager.formatIndent(
				lines.slice(start - 1, end).join("\n")
			).replace(/``/g, "`\u200b`");
		}

		let extension = (
			filename.includes(".") ? filename.split(".") : [""]
		).pop();
		if (extension) {
			extension = extension.split("?")[0];
		}
		if (!extension || /[^0-9a-z]/i.test(extension)) extension = "";

		return new LineData(lineLength, extension, toDisplay);
	}

	async extractCodeLinks(msg: string): Promise<IMessageData> {
		const returned: Promise<LineData | null>[] = [];
		const seen = new Set<string>();
		const accept = (match: RegExpMatchArray): boolean => {
			if (seen.has(match[0]) || seen.size >= MAX_LINKS_PER_MESSAGE) {
				return false;
			}
			seen.add(match[0]);
			return true;
		};

		for (const match of msg.matchAll(
			/https?:\/\/github\.com\/([\w-]+\/[\w.-]+)\/blob\/(.+?)\/(.+?)#L(\d+)[-~]?L?(\d*)/g
		)) {
			if (accept(match)) returned.push(this.handleMatch(match, "GitHub"));
		}

		for (const match of msg.matchAll(
			/https?:\/\/gitlab\.com\/([\w-]+\/[\w.-]+)\/-\/blob\/(.+?)\/(.+?)#L(\d+)-?(\d*)/g
		)) {
			if (accept(match)) returned.push(this.handleMatch(match, "GitLab"));
		}

		for (const match of msg.matchAll(
			/https?:\/\/gist\.github\.com\/([\w-]+\/[\da-zA-Z]+)\/?([\da-z]*)\/*#file-(.+?)-L(\d+)[-~]?L?(\d*)/g
		)) {
			if (accept(match)) returned.push(this.handleMatch(match, "Gist"));
		}

		const unfiltered = await Promise.all(returned);
		const filtered = unfiltered.filter((x) => x !== null) as LineData[];

		const totalLines = filtered.reduce((acc, el) => acc + el.lineLength, 0);
		return {
			msgList: filtered,
			totalLines
		};
	}

	/**
	 * This is Discord-level handleMessage(). It calls coreLogic-level handleMessage() and then
	 * performs necessary formatting and validation.
	 * @param msg Discord message object
	 */
	async handleMessage(msg: Message): Promise<{
		botMsg: null | string;
		toDelete: boolean;
		lang: LanguageData;
	}> {
		const { msgList, totalLines } = await this.extractCodeLinks(
			msg.content
		);
		const lang = await msg.client.func.getLanguageData(msg.guildId!);

		if (totalLines > MAX_DISPLAYED_LINES) {
			return {
				botMsg: lang.git_lines_avoiding_spam,
				toDelete: true,
				lang
			};
		}

		const messages = msgList.map(
			(el) =>
				`\`\`\`${el.toDisplay.search(/\S/) !== -1 ? el.extension : " "}\n${el.toDisplay}\n\`\`\``
		);

		const botMsg = messages.join("\n") || null;

		if (botMsg && botMsg.length >= 2000) {
			return {
				botMsg: lang.git_lines_avoiding_limit,
				toDelete: true,
				lang
			};
		}

		if (botMsg && msg.deletable) {
			// can always supress embed if deletable
			// it can take a few ms before the supress can be registered
			setTimeout(() => msg.suppressEmbeds(true).catch(logger.err), 100);
		}

		return { botMsg, toDelete: false, lang };
	}
}

export { GithubLinesManager };

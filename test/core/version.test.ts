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

const { parseGitRemote, buildInfo, commitUrl } =
	await import("../../src/version.ts");

describe("version: the build in the BOT document", () => {
	test("remotes become web links", () => {
		expect(parseGitRemote("git@gitlab.com:ihrz/ihrz.git")).toBe(
			"https://gitlab.com/ihrz/ihrz"
		);
		expect(parseGitRemote("https://gitlab.com/ihrz/ihrz.git\n")).toBe(
			"https://gitlab.com/ihrz/ihrz"
		);
		expect(parseGitRemote("https://gitlab.com/ihrz/ihrz")).toBe(
			"https://gitlab.com/ihrz/ihrz"
		);
	});

	test("credentials in an HTTPS remote never reach the (public) link", () => {
		expect(
			parseGitRemote(
				"https://oauth2:glpat-SECRET@gitlab.com/ihrz/ihrz.git"
			)
		).toBe("https://gitlab.com/ihrz/ihrz");
		expect(parseGitRemote("https://user@gitlab.com/ihrz/ihrz.git")).toBe(
			"https://gitlab.com/ihrz/ihrz"
		);
	});

	test("commit links: GitLab's own route, /commit/ elsewhere", () => {
		expect(commitUrl("https://gitlab.com/ihrz/ihrz", "abc")).toBe(
			"https://gitlab.com/ihrz/ihrz/-/commit/abc"
		);
		expect(commitUrl("https://github.com/x/y", "abc")).toBe(
			"https://github.com/x/y/commit/abc"
		);
	});

	test("no remote (standalone binary): an empty link", () => {
		expect(parseGitRemote("")).toBe("");
	});

	test("buildInfo: the commit link only with a commit and a web remote", () => {
		const b = buildInfo();
		expect(typeof b.version).toBe("string");
		if (b.commitUrl) {
			expect(b.commitUrl).toMatch(
				/^https:\/\/[^@\s]+\/commit\/[0-9a-f]{40}$/
			);
			expect(b.commitUrl.endsWith(b.commitLong!)).toBe(true);
			expect(b.commitLong!.startsWith(b.commit!)).toBe(true);
		}
	});
});

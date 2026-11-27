import { describe, expect, test } from "bun:test";

import {
	escapeHtml,
	guildJoinedMail,
	guildLeftMail,
	mailDate,
	readyMail,
	renderMail,
	safeUrl
} from "../../src/core/modules/mailTemplates.ts";

const AT = Date.UTC(2026, 10, 26, 21, 4);
const GUILD = {
	name: "<script>alert(1)</script> & co",
	id: "123456789012345678",
	memberCount: 1234,
	locale: "fr",
	vanity: "discord.gg/abc",
	iconUrl: "https://cdn.discordapp.com/icons/1/a.png",
	shard: 2,
	botName: "iHorizon",
	at: AT
};

describe("mail helpers", () => {
	test("escapeHtml escapes every HTML special character", () => {
		expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
			"&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
		);
	});

	test("safeUrl keeps https links only", () => {
		expect(safeUrl("https://ihorizon.org/x")).toBe(
			"https://ihorizon.org/x"
		);
		expect(safeUrl("javascript:alert(1)")).toBeNull();
		expect(safeUrl("http://ihorizon.org")).toBeNull();
		expect(safeUrl('https://a.b/"onmouseover=x')).toBeNull();
		expect(safeUrl(null)).toBeNull();
	});

	test("mailDate is the same for every reader (UTC)", () => {
		expect(mailDate(AT)).toBe("26 Nov 2026, 21:04 UTC");
	});
});

describe("mails", () => {
	test("a server name never becomes HTML", () => {
		const mail = guildJoinedMail({
			...GUILD,
			ownerName: "owner",
			ownerId: "1",
			invite: "https://discord.gg/abc",
			joinedAt: AT
		});
		expect(mail.html).not.toContain("<script>");
		expect(mail.html).toContain("&lt;script&gt;");
		expect(mail.subject).toBe(`New server: ${GUILD.name}`);
		expect(mail.html).toContain('href="https://discord.gg/abc"');
	});

	test("an unsafe link is dropped, its text kept", () => {
		const mail = renderMail({
			kind: "info",
			subject: "s",
			preheader: "p",
			title: "t",
			intro: "i",
			fields: [
				{ label: "L", value: "click", href: "javascript:alert(1)" }
			],
			button: { label: "Go", url: "data:text/html,x" },
			iconUrl: "javascript:x",
			botName: "iHorizon",
			at: AT
		});
		expect(mail.html).not.toContain("javascript:");
		expect(mail.html).not.toContain("data:text/html");
		expect(mail.html).toContain("click");
	});

	test("every mail has a plain-text version with its facts", () => {
		const ready = readyMail({
			botTag: "iHorizon#0001",
			botName: "iHorizon",
			shard: 1,
			guilds: 4200,
			at: AT
		});
		expect(ready.text).toContain("iHorizon#0001");
		expect(ready.text).toContain("4,200");
		expect(ready.text).not.toMatch(/<[a-z]/i);

		const left = guildLeftMail(GUILD);
		expect(left.subject).toBe(`Removed from: ${GUILD.name}`);
		expect(left.text).toContain(GUILD.id);
		expect(left.text).toContain("26 Nov 2026, 21:04 UTC");
		expect(left.html).toContain("<!doctype html");
	});
});

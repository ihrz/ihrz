import { describe, expect, test } from "bun:test";

import { messageDiff, trimPair } from "../../src/core/functions/messageDiff.ts";

describe("edited message diff", () => {
	test("a one-line edit: before in red, after in green", () => {
		expect(messageDiff("old text", "new text")).toBe(
			"- old text\n+ new text"
		);
	});

	test("a long message: only the changed line, one line of context, the rest collapsed", () => {
		const lines = Array.from({ length: 20 }, (_, i) => `line ${i}`);
		const edited = [...lines];
		edited[10] = "line ten, edited";
		expect(messageDiff(lines.join("\n"), edited.join("\n"))).toBe(
			[
				"  …",
				"  line 9",
				"- line 10",
				"+ line ten, edited",
				"  line 11",
				"  …"
			].join("\n")
		);
	});

	test("added and removed lines", () => {
		expect(messageDiff("a\nb\nc", "a\nc\nd")).toBe("  a\n- b\n  c\n+ d");
	});

	test("a long paragraph with a small change shows the window around it", () => {
		const start = "x".repeat(300);
		const end = "y".repeat(300);
		const [a, b] = trimPair(`${start} cat ${end}`, `${start} dog ${end}`);
		expect(a.startsWith("…") && a.endsWith("…")).toBe(true);
		expect(a).toContain(" cat ");
		expect(b).toContain(" dog ");
		expect(a.length).toBeLessThan(140);
		expect(
			messageDiff(`${start} cat ${end}`, `${start} dog ${end}`).split(
				"\n"
			).length
		).toBe(2);
	});

	test("a code block in the message can't close the diff block", () => {
		const out = messageDiff("```js\nx\n```", "```js\ny\n```");
		expect(out).not.toContain("```");
		expect(out).toContain("- x");
		expect(out).toContain("+ y");
	});

	test("never over the budget", () => {
		const big = (c: string) =>
			Array.from(
				{ length: 300 },
				(_, i) => `${c}${i} ${"z".repeat(30)}`
			).join("\n");
		const out = messageDiff(big("a"), big("b"), 3400);
		expect(out.length).toBeLessThanOrEqual(3400);
		expect(out.endsWith("…")).toBe(true);
	});

	test("emoji and accents are cut on whole characters", () => {
		const s = "é😀".repeat(200);
		const [a] = trimPair(`${s}A${s}`, `${s}B${s}`);
		expect(a).not.toContain("\uFFFD");
		expect([...a].every((c) => c.length <= 2)).toBe(true);
	});
});

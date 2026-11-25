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

// The before/after of an edited message as a ```diff block (Discord colours
// `-` lines red and `+` lines green): only what changed, with a line of
// context, and for a long line only the window around the change.

type Op = { kind: " " | "-" | "+"; text: string };

/** Lines kept around a change; further unchanged lines collapse into `…`. */
const CONTEXT_LINES = 1;
/** A changed line longer than this shows only the window around the change. */
const LONG_LINE = 160;
/** Characters kept on each side of the change inside a long line. */
const WINDOW = 60;
/** Lines compared at most (each side): past it, the rest is one change. */
const MAX_LINES = 400;

/** Line diff (longest common subsequence). */
export function lineOps(before: string[], after: string[]): Op[] {
	const a = before.slice(0, MAX_LINES);
	const b = after.slice(0, MAX_LINES);
	const n = a.length;
	const m = b.length;
	// lcs[i][j] = common lines between a[i..] and b[j..].
	const lcs: Uint16Array[] = Array.from(
		{ length: n + 1 },
		() => new Uint16Array(m + 1)
	);
	for (let i = n - 1; i >= 0; i--)
		for (let j = m - 1; j >= 0; j--)
			lcs[i][j] =
				a[i] === b[j]
					? lcs[i + 1][j + 1] + 1
					: Math.max(lcs[i + 1][j], lcs[i][j + 1]);
	const ops: Op[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			ops.push({ kind: " ", text: a[i] });
			i++;
			j++;
		} else if (lcs[i + 1][j] >= lcs[i][j + 1])
			ops.push({ kind: "-", text: a[i++] });
		else ops.push({ kind: "+", text: b[j++] });
	}
	while (i < n) ops.push({ kind: "-", text: a[i++] });
	while (j < m) ops.push({ kind: "+", text: b[j++] });
	for (const text of before.slice(MAX_LINES)) ops.push({ kind: "-", text });
	for (const text of after.slice(MAX_LINES)) ops.push({ kind: "+", text });
	return ops;
}

/** Both long versions of one line, cut to the window around what changed. */
export function trimPair(before: string, after: string): [string, string] {
	if (before.length <= LONG_LINE && after.length <= LONG_LINE)
		return [before, after];
	const a = [...before];
	const b = [...after];
	let prefix = 0;
	while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix])
		prefix++;
	let suffix = 0;
	while (
		suffix < a.length - prefix &&
		suffix < b.length - prefix &&
		a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
	)
		suffix++;
	const cut = (chars: string[]) => {
		const start = Math.max(0, prefix - WINDOW);
		const end = Math.min(chars.length, chars.length - suffix + WINDOW);
		return `${start > 0 ? "…" : ""}${chars.slice(start, end).join("")}${end < chars.length ? "…" : ""}`;
	};
	return [cut(a), cut(b)];
}

/** A line can't close the code block or start a new one. */
const safe = (text: string) => text.replaceAll("```", "`​`​`");

/**
 * The diff lines (without the fences), at most `max` characters. Identical
 * texts give an empty string.
 */
export function messageDiff(before: string, after: string, max = 3400): string {
	if (before === after) return "";
	const ops = lineOps(before.split("\n"), after.split("\n"));

	// Removed/added runs side by side: line k of one with line k of the other.
	for (let k = 0; k < ops.length;) {
		if (ops[k].kind !== "-") {
			k++;
			continue;
		}
		let end = k;
		while (end < ops.length && ops[end].kind === "-") end++;
		let plus = end;
		while (plus < ops.length && ops[plus].kind === "+") plus++;
		const pairs = Math.min(end - k, plus - end);
		for (let p = 0; p < pairs; p++) {
			const [a, b] = trimPair(ops[k + p].text, ops[end + p].text);
			ops[k + p].text = a;
			ops[end + p].text = b;
		}
		k = plus;
	}

	// Unchanged lines far from any change collapse into one `…`.
	const near = ops.map(() => false);
	ops.forEach((op, k) => {
		if (op.kind === " ") return;
		for (let d = -CONTEXT_LINES; d <= CONTEXT_LINES; d++)
			if (ops[k + d]) near[k + d] = true;
	});
	const lines: string[] = [];
	ops.forEach((op, k) => {
		if (op.kind !== " " || near[k])
			lines.push(`${op.kind} ${safe(op.text)}`);
		else if (lines[lines.length - 1] !== "  …") lines.push("  …");
	});

	let out = "";
	for (const line of lines) {
		const next = out ? `${out}\n${line}` : line;
		if (next.length > max - 2) return `${out}\n…`.trimStart();
		out = next;
	}
	return out;
}

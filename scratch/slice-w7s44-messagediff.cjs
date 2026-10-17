// W7 slice 44 battery: getDetailedDiff/getDifferenceIndex/getTruncatedLine verbatim replica.
function getDifferenceIndex(oldLine, newLine) {
	let diffIndex = -1;
	for (let i = 0; i < Math.min(oldLine.length, newLine.length); i++) {
		if (oldLine[i] !== newLine[i]) {
			diffIndex = i;
			break;
		}
	}
	return diffIndex === -1
		? Math.max(oldLine.length, newLine.length)
		: diffIndex;
}
function getTruncatedLine(line, diffIndex) {
	const maxLineLength = 30;
	const start = Math.max(0, diffIndex - Math.floor(maxLineLength / 2));
	const end = Math.min(line.length, start + maxLineLength);
	return line.substring(start, end);
}
function getDetailedDiff(oldText, newText) {
	const oldLines = oldText.trim().split("\n");
	const newLines = newText.trim().split("\n");
	const diff = [];
	const maxLineLength = 30;
	const maxLines = Math.max(oldLines.length, newLines.length);
	for (let i = 0; i < maxLines; i++) {
		const oldLine = oldLines[i] || "";
		const newLine = newLines[i] || "";
		let truncatedOldLine = oldLine;
		let truncatedNewLine = newLine;
		if (oldLine.length > maxLineLength) {
			const diffIndex = getDifferenceIndex(oldLine, newLine);
			truncatedOldLine = getTruncatedLine(oldLine, diffIndex);
		}
		if (newLine.length > maxLineLength) {
			const diffIndex = getDifferenceIndex(oldLine, newLine);
			truncatedNewLine = getTruncatedLine(newLine, diffIndex);
		}
		if (oldLine && !newLine) {
			diff.push(`- ${truncatedOldLine}`);
		} else if (!oldLine && newLine) {
			diff.push(`+ ${truncatedNewLine}`);
		} else if (oldLine !== newLine) {
			diff.push(`- ${truncatedOldLine}`);
			diff.push(`+ ${truncatedNewLine}`);
		}
	}
	return `\`\`\`diff\n${diff.join("\n")}\n\`\`\``;
}
const out = {};
// ASCII sanity
out.a1 = getDetailedDiff("hello world", "hello there");
// identical -> empty diff body
out.a2 = getDetailedDiff("same", "same");
// multiline add/remove
out.m1 = getDetailedDiff("l1\nl2\nl3", "l1\nlX\nl3\nl4");
// long lines, diff at end (truncation window)
out.t1 = getDetailedDiff("a".repeat(50), "a".repeat(49) + "b");
// long lines, diff at start
out.t2 = getDetailedDiff("b" + "a".repeat(50), "c" + "a".repeat(50));
// exactly 30 chars: no truncation (length > 30 strict)
out.t3 = getDetailedDiff("x".repeat(30), "x".repeat(29) + "y");
// 31 chars: truncation kicks in
out.t4 = getDetailedDiff("x".repeat(31), "x".repeat(30) + "y");
// astral: emoji diff (UTF-16 length 2 per emoji)
out.e1 = getDetailedDiff("😀😀😀 hello", "😀😀😀 world");
out.e2 = getDetailedDiff("😀".repeat(20), "😀".repeat(19) + "😁");
// emoji line > 30 UTF-16 units, diff at end: window in UTF-16 units
out.e3 = getDetailedDiff("a".repeat(10) + "😀".repeat(12), "a".repeat(10) + "😀".repeat(11) + "😁");
// diff index INSIDE a surrogate pair (old has BMP char where new has emoji lead)
out.e4 = getDetailedDiff("a😀b" + "x".repeat(40), "a😁b" + "x".repeat(40));
// empty/whitespace trims
out.w1 = getDetailedDiff("", "");
out.w2 = getDetailedDiff("   ", "hi");
out.w3 = getDetailedDiff("  padded  ", "  padded x  ");
// prefix lines: one side shorter
out.p1 = getDetailedDiff("short", "short and much longer than thirty characters here");
// combining mark vs precomposed (é as e+U+0301 vs U+00E9)
out.u1 = getDetailedDiff("café long line padding xxxxxxxxxxx", "café long line padding xxxxxxxxxxx");
console.log(JSON.stringify(out));

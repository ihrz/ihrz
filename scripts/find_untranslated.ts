import { readFileSync } from "fs";
import { Glob } from "bun";

const untranslated = new Set<string>();
const glob = new Glob("src/Interaction/**/*.ts");

for await (const file of glob.scan(".")) {
	const content = readFileSync(file, "utf-8");
	const regex = /ja:\s*"((?:[^"\\]|\\.)*)"/g;
	let match;
	while ((match = regex.exec(content)) !== null) {
		const text = match[1];
		if (
			/^[a-zA-Z0-9\s.,!?();:/@#$%^&*+=\-\[\]{}|<>`~'_"]+$/.test(text) &&
			text.length > 3 &&
			text !== "..."
		) {
			untranslated.add(text);
		}
	}
}

const sorted = Array.from(untranslated).sort();
for (const s of sorted) {
	console.log(s);
}
console.log("\nTotal untranslated:", sorted.length);

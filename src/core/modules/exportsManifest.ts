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

// Static exports of every file the handlers load (commands, subcommands,
// events, components, client functions, SVG templates).
//
// Shards never walk the source tree: each handler imports its generated
// `src/exports/<name>.ts` (static imports only), so a boot costs no
// directory scan and stays bundleable. The files are committed:
// - `bun run dev` (outside the ShardingManager) rewrites the ones that
//   changed before the handlers run, so dev always boots on fresh exports;
// - `bun run gen:exports` does the same by hand, `--check` only reports;
// - the ShardingManager (once per machine) warns when they are stale,
//   without writing anything: prod never dirties the git checkout.

import path from "node:path";

import { LICENCE_HEADER } from "../../../tools/LicenceHeader.ts";

// module: namespace import, text: file content, lazy: `() => import()`
// (loaded on first use only, still bundled), file: path of the file (real
// path from src, embedded `/$bunfs/` path inside a standalone binary).
type ExportKind = "module" | "text" | "lazy" | "file";

interface ExportSpec {
	// Generated file name, in src/exports.
	name: string;
	// Scanned directory, relative to src.
	root: string;
	kind: ExportKind;
	// Path relative to `root`, posix separators.
	include: (relativePath: string) => boolean;
}

// From the working directory, like every other path of the bot: inside the
// shard bundle, import.meta.dir is dist/shard.
const SRC_DIR = path.join(process.cwd(), "src");
const EXPORTS_DIR = path.join(SRC_DIR, "exports");

const isTopLevel = (relativePath: string) => !relativePath.includes("/");

// Command trees: `!`-prefixed directories are skipped, a `!name.ts` file
// is the subcommand `name` of the command in the same directory. At the
// root they are the copy-me templates, never loaded.
function isCommandTreeFile(relativePath: string): boolean {
	const segments = relativePath.split("/");
	const file = segments[segments.length - 1];

	if (segments.slice(0, -1).some((segment) => segment.startsWith("!"))) {
		return false;
	}
	if (file.startsWith("!") && segments.length < 2) return false;

	return file.endsWith(".ts") || file === "init.json";
}

const EXPORT_SPECS: ExportSpec[] = [
	{
		name: "hybridCommands",
		root: "Interaction/HybridCommands",
		kind: "module",
		include: isCommandTreeFile
	},
	{
		name: "slashCommands",
		root: "Interaction/SlashCommands",
		kind: "module",
		include: isCommandTreeFile
	},
	{
		name: "messageCommands",
		root: "Interaction/MessageCommands",
		kind: "module",
		include: (relativePath) =>
			relativePath.endsWith(".ts") &&
			!relativePath.split("/").some((segment) => segment.startsWith("!"))
	},
	{
		name: "messageApplicationCommands",
		root: "Interaction/MessageApplicationCommands",
		kind: "module",
		include: (relativePath) =>
			isTopLevel(relativePath) && relativePath.endsWith(".ts")
	},
	{
		name: "userApplicationCommands",
		root: "Interaction/UserApplicationCommands",
		kind: "module",
		include: (relativePath) =>
			isTopLevel(relativePath) && relativePath.endsWith(".ts")
	},
	{
		name: "events",
		root: "Events",
		kind: "module",
		include: (relativePath) => relativePath.endsWith(".ts")
	},
	{
		name: "buttons",
		root: "Interaction/Components/Buttons",
		kind: "module",
		include: (relativePath) =>
			isTopLevel(relativePath) && relativePath.endsWith(".ts")
	},
	{
		name: "selectMenus",
		root: "Interaction/Components/SelectMenu",
		kind: "module",
		include: (relativePath) =>
			isTopLevel(relativePath) && relativePath.endsWith(".ts")
	},
	{
		name: "functions",
		root: "core/functions",
		kind: "module",
		include: (relativePath) =>
			isTopLevel(relativePath) && relativePath.endsWith(".ts")
	},
	{
		name: "lang",
		root: "lang",
		kind: "lazy",
		include: (relativePath) =>
			isTopLevel(relativePath) && relativePath.endsWith(".ts")
	},
	{
		// Read at runtime by resvg, ffmpeg, Kdenlive or Discord uploads: a
		// standalone binary extracts them (see resources.ts). The SVG
		// templates are already in "svg", src/assets/old is unused.
		name: "assets",
		root: "assets",
		kind: "file",
		include: (relativePath) =>
			!relativePath.startsWith("svg/") &&
			!relativePath.startsWith("old/") &&
			!relativePath.endsWith(".md")
	},
	{
		name: "svg",
		root: "assets/svg",
		kind: "text",
		include: (relativePath) =>
			isTopLevel(relativePath) && relativePath.endsWith(".svg")
	}
];

async function scanSpec(spec: ExportSpec): Promise<string[]> {
	const files: string[] = [];
	const glob = new Bun.Glob("**/*");

	for await (const file of glob.scan({
		cwd: path.join(SRC_DIR, spec.root),
		onlyFiles: true
	})) {
		const relativePath = file.split(path.sep).join("/");
		if (spec.include(relativePath)) files.push(relativePath);
	}

	// Deterministic order: the same tree always renders the same file.
	return files.sort();
}

function renderSpec(spec: ExportSpec, files: string[]): string {
	const imports: string[] = [];
	const entries: string[] = [];

	files.forEach((file, index) => {
		const id = `m${index}`;
		const source = JSON.stringify(`../${spec.root}/${file}`);

		if (spec.kind === "lazy") {
			entries.push(`\t${JSON.stringify(file)}: () => import(${source})`);
			return;
		}

		if (spec.kind === "text" || spec.kind === "file") {
			imports.push(
				`import ${id} from ${source} with { type: "${spec.kind}" };`
			);
		} else if (file.endsWith(".json")) {
			imports.push(
				`import * as ${id} from ${source} with { type: "json" };`
			);
		} else {
			imports.push(`import * as ${id} from ${source};`);
		}

		entries.push(`\t${JSON.stringify(file)}: ${id}`);
	});

	const valueType =
		spec.kind === "text" || spec.kind === "file"
			? "string"
			: spec.kind === "lazy"
				? "() => Promise<any>"
				: "any";

	return (
		LICENCE_HEADER +
		"\n\n" +
		`// Generated from src/${spec.root} by src/core/modules/exportsManifest.ts.\n` +
		"// Do not edit: `bun run dev` or `bun run gen:exports` rewrites it.\n\n" +
		(imports.length ? imports.join("\n") + "\n\n" : "") +
		`const files: Record<string, ${valueType}> = {` +
		(entries.length ? "\n" + entries.join(",\n") + "\n" : "") +
		"};\n\nexport default files;\n"
	);
}

export interface ExportsReport {
	// Generated files whose content differs from the tree (or missing).
	stale: string[];
}

async function compareExports(
	write: boolean
): Promise<ExportsReport & { written: string[] }> {
	const stale: string[] = [];
	const written: string[] = [];

	for (const spec of EXPORT_SPECS) {
		const expected = renderSpec(spec, await scanSpec(spec));
		const target = Bun.file(path.join(EXPORTS_DIR, `${spec.name}.ts`));
		const current = (await target.exists()) ? await target.text() : null;

		if (current === expected) continue;

		stale.push(spec.name);

		if (write) {
			await Bun.write(target, expected);
			written.push(spec.name);
		}
	}

	return { stale, written };
}

// Read-only: names of the generated files that no longer match the tree.
export async function checkExports(): Promise<string[]> {
	return (await compareExports(false)).stale;
}

// Rewrites only the generated files that changed, returns their names.
export async function writeExports(): Promise<string[]> {
	return (await compareExports(true)).written;
}

// Files of a command tree export, keyed by path relative to its root.
export type ExportedFiles = Record<string, any>;

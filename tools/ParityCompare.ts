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

// tools/ParityCompare.ts — repeatable TS-vs-Rust registry comparator.
// TS side: static import of each command file's exported `command` object
// (never boots the bot). Rust side: src/files/commands.json registry dump.
// Run: bun run tools/ParityCompare.ts
// Exit code is non-zero when any divergence exists.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const COMMAND_DIRS = [
	"src/Interaction/HybridCommands",
	"src/Interaction/SlashCommands",
	"src/Interaction/MessageCommands",
	"src/Interaction/UserApplicationCommands",
	"src/Interaction/MessageApplicationCommands"
];
const RUST_DUMP = path.join(REPO_ROOT, "src/files/commands.json");

type LeafMap = Map<string, string[]>;

interface RegistryEntry {
	category: string;
	leaves: LeafMap;
}

interface RustRegistryEntry extends RegistryEntry {
	// True when the dump entry registers no slash options: it exists only
	// as a prefix (or context-menu) mirror, e.g. "embed" of utils.
	prefixOnly: boolean;
}

function out(line: string): void {
	process.stdout.write(line + "\n");
}

function collectFiles(dir: string): string[] {
	const found: string[] = [];
	for (const item of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, item.name);
		if (item.isDirectory()) {
			found.push(...collectFiles(full));
		} else if (item.isFile() && item.name.endsWith(".ts")) {
			if (item.name.startsWith("!Blank")) continue;
			found.push(full);
		}
	}
	return found;
}

function extractLeaves(
	options: any[] | undefined,
	prefix: string,
	leaves: LeafMap
): void {
	const opts = Array.isArray(options) ? options : [];
	const params = opts
		.filter((o) => o && o.type !== 1 && o.type !== 2)
		.map((o) => String(o.name));
	const subs = opts.filter((o) => o && (o.type === 1 || o.type === 2));
	const key = prefix || "(root)";
	if (subs.length === 0) {
		leaves.set(key, [...new Set(params)].sort());
		return;
	}
	if (params.length > 0) leaves.set(key, [...new Set(params)].sort());
	for (const sub of subs) {
		const next = prefix ? `${prefix} ${sub.name}` : String(sub.name);
		extractLeaves(sub.options, next, leaves);
	}
}

function normalizeCommand(cmd: any): RegistryEntry {
	const leaves: LeafMap = new Map();
	extractLeaves(cmd?.options, "", leaves);
	return { category: String(cmd?.category ?? "unknown"), leaves };
}

function stubGlobalClient(): void {
	// Some command files reference the global `client` at module top-level
	// (e.g. utils.ts via client.timeCalculator in option definitions), which
	// throws on bare dynamic import. A minimal stub keeps the import clean;
	// option values are never compared, only names/types/structure.
	const g = globalThis as Record<string, any>;
	if (g.client !== undefined) return;
	const anything: any = new Proxy(function () {}, {
		get: (_t, prop) => {
			if (prop === Symbol.toPrimitive) return () => 0;
			if (prop === "to_ms") return () => 0;
			if (prop === "to_beautiful_string") return () => "";
			return anything;
		},
		apply: () => anything,
		construct: () => ({})
	});
	g.client = new Proxy(
		{
			timeCalculator: {
				to_ms: () => 0,
				to_beautiful_string: () => ""
			}
		},
		{
			get: (t, prop) => (prop in t ? (t as any)[prop] : anything)
		}
	);
}

async function loadTsRegistry(): Promise<{
	registry: Map<string, RegistryEntry>;
	warnings: string[];
}> {
	const registry = new Map<string, RegistryEntry>();
	const warnings: string[] = [];
	stubGlobalClient();
	// Import everything first so `subCommand`-only modules (!name.ts) can
	// resolve their parent command regardless of directory order.
	const modules: { file: string; mod: any }[] = [];
	for (const rel of COMMAND_DIRS) {
		for (const file of collectFiles(path.join(REPO_ROOT, rel))) {
			let mod: any;
			try {
				mod = await import(pathToFileURL(file).href);
			} catch (err) {
				warnings.push(
					`import failed: ${path.relative(REPO_ROOT, file)}: ${String((err as Error)?.message ?? err).split("\n")[0]}`
				);
				continue;
			}
			modules.push({ file, mod });
		}
	}
	// Pass 1: index `command` exports; remember each directory's parent.
	const dirCommands = new Map<string, string>();
	for (const { file, mod } of modules) {
		const cmd = mod?.command;
		if (!cmd || typeof cmd.name !== "string") continue;
		if (registry.has(cmd.name)) {
			warnings.push(
				`duplicate command name "${cmd.name}" (also in ${path.relative(REPO_ROOT, file)})`
			);
			continue;
		}
		registry.set(cmd.name, normalizeCommand(cmd));
		const dir = path.dirname(file);
		if (!dirCommands.has(dir)) dirCommands.set(dir, cmd.name);
	}
	// Pass 2: index `subCommand`-only modules (e.g. !embed.ts) as leaves of
	// the parent command defined in the same directory. Only missing leaves
	// are added; the parent's inline option tree is never clobbered.
	for (const { file, mod } of modules) {
		const cmd = mod?.command;
		if (cmd && typeof cmd.name === "string") continue;
		if (!mod?.subCommand) continue;
		const leaf = path.basename(file, ".ts").replace(/^!/, "");
		if (!leaf) continue;
		const parentName = dirCommands.get(path.dirname(file));
		if (!parentName) continue;
		const parent = registry.get(parentName);
		if (!parent) continue;
		// The bot wires ! modules per parent-tree option (possibly nested
		// under a group, e.g. "interface set-staff-role"), so a leaf already
		// represented at any depth must not be re-added as a bare leaf.
		if (parent.leaves.has(leaf)) continue;
		let nested = false;
		for (const key of parent.leaves.keys()) {
			if (key.endsWith(` ${leaf}`)) {
				nested = true;
				break;
			}
		}
		if (!nested) parent.leaves.set(leaf, []);
	}
	return { registry, warnings };
}

function loadRustRegistry(): Map<string, RustRegistryEntry> {
	const raw = JSON.parse(readFileSync(RUST_DUMP, "utf8"));
	const list = Array.isArray(raw) ? raw : [];
	const registry = new Map<string, RustRegistryEntry>();
	for (const cmd of list) {
		if (!cmd || typeof cmd.name !== "string" || registry.has(cmd.name))
			continue;
		const entry = normalizeCommand(cmd);
		const options = cmd?.options;
		registry.set(cmd.name, {
			...entry,
			prefixOnly: !Array.isArray(options) || options.length === 0
		});
	}
	return registry;
}

function findLeafOwner(
	tsReg: Map<string, RegistryEntry>,
	leaf: string
): string | null {
	for (const [name, entry] of tsReg) {
		if (entry.leaves.has(leaf)) return name;
		for (const key of entry.leaves.keys()) {
			if (key.endsWith(` ${leaf}`)) return name;
		}
	}
	return null;
}

function compareLeaves(ts: LeafMap, rust: LeafMap): string[] {
	const notes: string[] = [];
	for (const leaf of [...ts.keys()].sort()) {
		if (!rust.has(leaf)) {
			notes.push(`missing sub in rust: "${leaf}"`);
			continue;
		}
		const tsParams = ts.get(leaf)!;
		const rustParams = new Set(rust.get(leaf)!);
		for (const p of tsParams)
			if (!rustParams.has(p))
				notes.push(`missing param in rust: "${leaf}" param "${p}"`);
		for (const p of rust.get(leaf)!)
			if (!tsParams.includes(p))
				notes.push(`invented param in rust: "${leaf}" param "${p}"`);
	}
	for (const leaf of [...rust.keys()].sort()) {
		if (!ts.has(leaf)) notes.push(`invented sub in rust: "${leaf}"`);
	}
	return notes;
}

const { registry: tsReg, warnings } = await loadTsRegistry();
const rustReg = loadRustRegistry();
for (const w of warnings) out(`WARNING ${w}`);

const names = [...new Set([...tsReg.keys(), ...rustReg.keys()])].sort();
let matched = 0;
let divergent = 0;
let tsOnly = 0;
let rustOnly = 0;

for (const name of names) {
	const ts = tsReg.get(name);
	const rust = rustReg.get(name);
	if (!ts) {
		// Prefix-only dump entries (no slash options) are prefix mirrors of
		// slash subcommand leaves; compare them as leaves when a TS parent
		// carries the leaf instead of reporting one-sided noise.
		if (rust!.prefixOnly && findLeafOwner(tsReg, name)) {
			matched++;
			out(`MATCH ${name}`);
			continue;
		}
		rustOnly++;
		divergent++;
		out(
			`DIVERGENT ${name}: only in rust registry (category ${rust!.category})`
		);
		continue;
	}
	if (!rust) {
		tsOnly++;
		divergent++;
		out(`DIVERGENT ${name}: only in TS sources (category ${ts.category})`);
		continue;
	}
	const notes = compareLeaves(ts.leaves, rust.leaves);
	if (notes.length === 0) {
		matched++;
		out(`MATCH ${name}`);
	} else {
		divergent++;
		out(`DIVERGENT ${name}:`);
		for (const note of notes) out(`  - ${note}`);
	}
}

out(
	`summary: total=${names.length} match=${matched} divergent=${divergent} ts_only=${tsOnly} rust_only=${rustOnly} warnings=${warnings.length}`
);
process.exit(divergent > 0 || warnings.length > 0 ? 1 : 0);

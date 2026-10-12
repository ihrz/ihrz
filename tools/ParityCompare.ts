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
	"src/Interaction/MessageCommands"
];
const RUST_DUMP = path.join(REPO_ROOT, "src/files/commands.json");

type LeafMap = Map<string, string[]>;

interface RegistryEntry {
	category: string;
	leaves: LeafMap;
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

function extractLeaves(options: any[] | undefined, prefix: string, leaves: LeafMap): void {
	const opts = Array.isArray(options) ? options : [];
	const params = opts.filter((o) => o && o.type !== 1 && o.type !== 2).map((o) => String(o.name));
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

async function loadTsRegistry(): Promise<{ registry: Map<string, RegistryEntry>; warnings: string[] }> {
	const registry = new Map<string, RegistryEntry>();
	const warnings: string[] = [];
	for (const rel of COMMAND_DIRS) {
		for (const file of collectFiles(path.join(REPO_ROOT, rel))) {
			let mod: any;
			try {
				mod = await import(pathToFileURL(file).href);
			} catch (err) {
				warnings.push(`import failed: ${path.relative(REPO_ROOT, file)}: ${String((err as Error)?.message ?? err).split("\n")[0]}`);
				continue;
			}
			const cmd = mod?.command;
			if (!cmd || typeof cmd.name !== "string") continue;
			if (registry.has(cmd.name)) {
				warnings.push(`duplicate command name "${cmd.name}" (also in ${path.relative(REPO_ROOT, file)})`);
				continue;
			}
			registry.set(cmd.name, normalizeCommand(cmd));
		}
	}
	return { registry, warnings };
}

function loadRustRegistry(): Map<string, RegistryEntry> {
	const raw = JSON.parse(readFileSync(RUST_DUMP, "utf8"));
	const list = Array.isArray(raw) ? raw : [];
	const registry = new Map<string, RegistryEntry>();
	for (const cmd of list) {
		if (!cmd || typeof cmd.name !== "string" || registry.has(cmd.name)) continue;
		registry.set(cmd.name, normalizeCommand(cmd));
	}
	return registry;
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
		for (const p of tsParams) if (!rustParams.has(p)) notes.push(`missing param in rust: "${leaf}" param "${p}"`);
		for (const p of rust.get(leaf)!) if (!tsParams.includes(p)) notes.push(`invented param in rust: "${leaf}" param "${p}"`);
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
		rustOnly++;
		divergent++;
		out(`DIVERGENT ${name}: only in rust registry (category ${rust!.category})`);
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

out(`summary: total=${names.length} match=${matched} divergent=${divergent} ts_only=${tsOnly} rust_only=${rustOnly} warnings=${warnings.length}`);
process.exit(divergent > 0 || warnings.length > 0 ? 1 : 0);

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
	// True when the TS source is a prefix file (MessageCommands dir or
	// a `!`-prefixed subcommand module). Only these may match rust
	// registry leaves flat by name.
	prefixFile: boolean;
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

function normalizeCommand(cmd: any, prefixFile = false): RegistryEntry {
	const leaves: LeafMap = new Map();
	extractLeaves(cmd?.options, "", leaves);
	return {
		category: String(cmd?.category ?? "unknown"),
		leaves,
		prefixFile
	};
}

function isPrefixFile(file: string): boolean {
	return (
		file.includes("MessageCommands") || path.basename(file).startsWith("!")
	);
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
		const prefixFile = isPrefixFile(file);
		if (registry.has(cmd.name)) {
			const existing = registry.get(cmd.name)!;
			existing.prefixFile = existing.prefixFile || prefixFile;
			warnings.push(
				`duplicate command name "${cmd.name}" (also in ${path.relative(REPO_ROOT, file)})`
			);
			continue;
		}
		registry.set(cmd.name, normalizeCommand(cmd, prefixFile));
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

function indexRustLeaves(
	cmdName: string,
	options: any[] | undefined,
	trail: string[],
	index: Map<string, string>
): void {
	for (const opt of Array.isArray(options) ? options : []) {
		if (!opt || typeof opt.name !== "string") continue;
		const qualified = [cmdName, ...trail, opt.name].join(" ");
		if (!index.has(opt.name)) index.set(opt.name, qualified);
		if (Array.isArray(opt.options))
			indexRustLeaves(cmdName, opt.options, [...trail, opt.name], index);
	}
}

function loadRustRegistry(): {
	registry: Map<string, RustRegistryEntry>;
	leafIndex: Map<string, string>;
} {
	const raw = JSON.parse(readFileSync(RUST_DUMP, "utf8"));
	const list = Array.isArray(raw) ? raw : [];
	const registry = new Map<string, RustRegistryEntry>();
	const leafIndex = new Map<string, string>();
	for (const cmd of list) {
		if (!cmd || typeof cmd.name !== "string" || registry.has(cmd.name))
			continue;
		const entry = normalizeCommand(cmd);
		const options = cmd?.options;
		registry.set(cmd.name, {
			...entry,
			prefixOnly: !Array.isArray(options) || options.length === 0
		});
		indexRustLeaves(cmd.name, options, [], leafIndex);
	}
	return { registry, leafIndex };
}

function buildTsLeafIndex(
	tsReg: Map<string, RegistryEntry>
): Map<string, string> {
	// Flat leaf-name index over the TS side: every nested option leaf key
	// maps by its bare leaf name to the qualified `<command> <path>` form.
	const index = new Map<string, string>();
	for (const [name, entry] of tsReg) {
		for (const key of entry.leaves.keys()) {
			if (key === "(root)") continue;
			const leaf = key.split(" ").pop()!;
			if (!leaf || index.has(leaf)) continue;
			index.set(leaf, `${name} ${key}`);
		}
	}
	return index;
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

interface Exemption {
	command: string;
	// "command" exempts every divergent note of the command;
	// "note" exempts only the single divergent note containing `note`.
	kind: "command" | "note";
	note: string;
	reason: string;
	ref: string;
}

function exemptNotes(
	command: string,
	list: string[],
	reason: string,
	ref: string
): Exemption[] {
	return list.map((note) => ({
		command,
		kind: "note" as const,
		note,
		reason,
		ref
	}));
}

// VERIFIED-DELIBERATE exemptions: each entry was proven deliberate
// against the cited ref before encoding. Anything without such proof
// stays a genuine divergence (e.g. notifier `template`: the param is
// absent from rust/src/commands/notifier/message.rs, so the dump entry
// is stale-artifact drift, not design — deliberately NOT exempted).
const EXEMPT: Exemption[] = [
	// antispam: TS declares manage/bypass-roles/ignore-channels as bare
	// slash leaves (antispam.ts:43-94); Rust expands the prefix !legs
	// into groups + slash params. Matcher name-alias artifact.
	...exemptNotes(
		"antispam",
		[
			`missing sub in rust: "bypass-roles"`,
			`missing sub in rust: "ignore-channels"`,
			`invented param in rust: "manage" param "enabled"`,
			`invented param in rust: "manage" param "ignore_bots"`,
			`invented param in rust: "manage" param "max_interval"`,
			`invented param in rust: "manage" param "preset"`,
			`invented param in rust: "manage" param "punish_time"`,
			`invented param in rust: "manage" param "punishment_type"`,
			`invented param in rust: "manage" param "remove_messages"`,
			`invented param in rust: "manage" param "threshold"`,
			`invented sub in rust: "bypass-roles add"`,
			`invented sub in rust: "bypass-roles clear"`,
			`invented sub in rust: "bypass-roles list"`,
			`invented sub in rust: "bypass-roles remove"`,
			`invented sub in rust: "ignore-channels add"`,
			`invented sub in rust: "ignore-channels clear"`,
			`invented sub in rust: "ignore-channels list"`,
			`invented sub in rust: "ignore-channels remove"`
		],
		"bare TS leaves vs Rust !leg group expansion (matcher alias artifact)",
		"HybridCommands/antispam/!manage.ts,!bypass-roles.ts,!ignore-channels.ts"
	),
	// config show page: TS has zero options and pages via collector;
	// the page option is the deliberate stateless replacement (same
	// precedent as perm list-all).
	...exemptNotes(
		"guildconfig",
		[`invented param in rust: "config show" param "page"`],
		"deliberate stateless replacement for the TS collector pager",
		"rust/src/commands/guildconfig/show.rs; SlashCommands/guildconfig/!show.ts:296-348"
	),
	// sticker/top/wlroles-add/wlroles-list: TS MessageCommands, never
	// slash-registered; Rust keeps them prefix-only (the flat leaf
	// index already MATCHes them — this only silences the per-command
	// structural diff, which ignores prefix-only organization).
	...exemptNotes(
		"utils",
		[
			`invented sub in rust: "sticker"`,
			`invented sub in rust: "top"`,
			`invented sub in rust: "wlroles-add"`,
			`invented sub in rust: "wlroles-list"`
		],
		"prefix-only MessageCommand ports, no TS slash home",
		"MessageCommands/utils/top.ts,sticker.ts; mod.rs PREFIX_ONLY_MESSAGE_COMMANDS/SPLITS"
	),
	...exemptNotes(
		"join-ghostping",
		[`invented sub in rust: "ghost-list"`],
		"Rust-only prefix reader, no TS slash home",
		"rust/src/commands/guildconfig/join_ghostping.rs:10; mod.rs PREFIX_ONLY_RUST_READERS"
	),
	{
		command: "legacy",
		kind: "command",
		note: "",
		reason: "Rust-only prefix organizer; TS has no legacy command",
		ref: "rust/src/commands/legacy/legacy.rs (prefix only); no TS name:legacy"
	},
	// protect: TS ships both protect + allowlist; Rust merges the
	// allowlist legs under protect with the allow- prefix (mod.rs frozen).
	...exemptNotes(
		"protect",
		[
			`invented sub in rust: "allow-add"`,
			`invented sub in rust: "allow-remove"`,
			`invented sub in rust: "allow-show"`
		],
		"allowlist legs merged under protect (mod.rs frozen)",
		"rust/src/commands/protection/protect.rs:297-306; SlashCommands/protection/allowlist/allowlist.ts"
	),
	{
		command: "schedule",
		kind: "command",
		note: "",
		reason: "TS option-less interactive root; Rust deliberate slash surface",
		ref: "HybridCommands/schedule/schedule.ts (no options); rust schedule.rs/panel.rs"
	},
	// confession list: ADOPT Rust-only count-only mod tool (read-only check).
	...exemptNotes(
		"confession",
		[`invented sub in rust: "list"`],
		"ADOPT Rust-only count-only mod tool",
		"rust/src/commands/confession/list.rs:28"
	),
	// tag: kept single-role toggle legs; the multi-select panels are
	// intentionally unported.
	...exemptNotes(
		"tag",
		[
			`invented param in rust: "wlroles-create" param "role"`,
			`invented param in rust: "wlroles-use" param "role"`
		],
		"kept single-role toggle; multi-select panel intentionally unported",
		"rust/src/commands/tag/wlroles_create.rs:12-14; wlroles_use.rs"
	),
	// mod: page is a deliberate additive pagination extra (no TS counterpart).
	...exemptNotes(
		"mod",
		[
			`invented param in rust: "banlist" param "page"`,
			`invented param in rust: "mutelist" param "page"`,
			`invented param in rust: "warnlist" param "page"`
		],
		"deliberate additive pagination extra",
		"rust/src/commands/moderation/banlist.rs:5-9"
	),
	// honeypot: TS config is a bare leaf with an interactive panel
	// (!config.ts selects+buttons); Rust exposes the same five panel
	// fields as slash params.
	...exemptNotes(
		"honeypot",
		[
			`invented param in rust: "config" param "action"`,
			`invented param in rust: "config" param "channel"`,
			`invented param in rust: "config" param "logs_channel"`,
			`invented param in rust: "config" param "message"`,
			`invented param in rust: "config" param "power"`
		],
		"TS interactive panel fields exposed as slash params",
		"rust/src/commands/honeypot/config.rs:892-903; SlashCommands/honeypot/!config.ts"
	),
	// music trackinfo title: optional search param mirroring the TS leg read.
	...exemptNotes(
		"music",
		[`invented param in rust: "trackinfo" param "title"`],
		"optional search param mirroring the TS leg read",
		"rust/src/commands/music/trackinfo.rs:15-17; HybridCommands/music/!trackinfo.ts:56"
	)
];

function exemptionFor(command: string, note: string): Exemption | undefined {
	return EXEMPT.find(
		(e) =>
			e.command === command &&
			(e.kind === "command" || note.includes(e.note))
	);
}

const { registry: tsReg, warnings } = await loadTsRegistry();
const { registry: rustReg, leafIndex: rustLeafIndex } = loadRustRegistry();
const tsLeafIndex = buildTsLeafIndex(tsReg);
for (const w of warnings) out(`WARNING ${w}`);

const names = [...new Set([...tsReg.keys(), ...rustReg.keys()])].sort();
let matched = 0;
let divergent = 0;
let exempt = 0;
let tsOnly = 0;
let rustOnly = 0;

function emitNotes(name: string, notes: string[]): void {
	if (notes.length === 0) {
		matched++;
		out(`MATCH ${name}`);
		return;
	}
	const kept = notes.filter((n) => !exemptionFor(name, n));
	if (kept.length === 0) {
		exempt++;
		out(`EXEMPT ${name}: ${exemptionFor(name, notes[0])!.reason}`);
		return;
	}
	divergent++;
	out(`DIVERGENT ${name}:`);
	for (const note of kept) out(`  - ${note}`);
}

for (const name of names) {
	const ts = tsReg.get(name);
	const rust = rustReg.get(name);
	if (!ts) {
		// Prefix-only dump entries (no slash options) are prefix mirrors of
		// slash subcommand leaves; compare them as leaves when a TS parent
		// carries the leaf instead of reporting one-sided noise.
		const owner = tsLeafIndex.get(name);
		if (rust!.prefixOnly && owner) {
			matched++;
			out(`MATCH ${name} (ts leaf ${owner})`);
			continue;
		}
		const note = `only in rust registry (category ${rust!.category})`;
		if (exemptionFor(name, note)) {
			exempt++;
			out(`EXEMPT ${name}: ${exemptionFor(name, note)!.reason}`);
			continue;
		}
		rustOnly++;
		divergent++;
		out(`DIVERGENT ${name}: ${note}`);
		continue;
	}
	if (!rust) {
		// Prefix-file TS commands (MessageCommands + !-files) live as nested
		// leaves in the dump; a flat leaf-name hit is a match, reported with
		// the qualified `<command> <group?> <leaf>` path from the dump.
		const qualified = rustLeafIndex.get(name);
		if (ts.prefixFile && qualified) {
			matched++;
			out(`MATCH ${name} (rust leaf ${qualified})`);
			continue;
		}
		const note = `only in TS sources (category ${ts.category})`;
		if (exemptionFor(name, note)) {
			exempt++;
			out(`EXEMPT ${name}: ${exemptionFor(name, note)!.reason}`);
			continue;
		}
		tsOnly++;
		divergent++;
		out(`DIVERGENT ${name}: ${note}`);
		continue;
	}
	emitNotes(name, compareLeaves(ts.leaves, rust.leaves));
}

out(
	`summary: total=${names.length} match=${matched} divergent=${divergent} exempt=${exempt} ts_only=${tsOnly} rust_only=${rustOnly} warnings=${warnings.length}`
);
process.exit(divergent > 0 || warnings.length > 0 ? 1 : 0);

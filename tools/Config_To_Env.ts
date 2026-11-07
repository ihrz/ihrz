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

// Moves a legacy src/files/config.ts into .env (`bun run config:env`).
//
// Keys already set in .env are kept (BOT_TOKEN and LASTFM_* there already
// won over config.ts), the others are added or filled in, comments and the
// remaining lines are left untouched. The result is read back by Bun and
// compared before config.ts is renamed to config.ts.migrated. No value is
// ever printed.

import path from "node:path";
import { rename } from "node:fs/promises";

import logger from "../src/core/logger.ts";
import {
	configFromEnv,
	configToEnv,
	LEGACY_CONFIG_PATH
} from "../src/core/modules/envConfig.ts";
import { ConfigData } from "../types/configDatad.js";

const ENV_PATH = path.join(process.cwd(), ".env");

// Bun's .env double quotes expand `$NAME` (escaped as `\$`) and keep every
// other backslash sequence as written except `\n`: a `"`, a backslash or a
// newline cannot be written exactly, the read-back check below refuses them.
function quote(value: string): string {
	return `"${value.replaceAll("$", "\\$")}"`;
}

if (!(await Bun.file(LEGACY_CONFIG_PATH).exists())) {
	logger.log("No src/files/config.ts: nothing to migrate.");
	process.exit(0);
}

const legacy = (await import(LEGACY_CONFIG_PATH)).default as ConfigData;
const wanted = configToEnv(legacy);

const envFile = Bun.file(ENV_PATH);
const lines = (await envFile.exists())
	? (await envFile.text()).split("\n")
	: [];

const keyOf = (line: string) =>
	line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];

const added: string[] = [];
const filled: string[] = [];

for (const [key, value] of Object.entries(wanted)) {
	const index = lines.findIndex((line) => keyOf(line) === key);

	if (index === -1) {
		lines.push(`${key}=${quote(value)}`);
		added.push(key);
	} else if (!(process.env[key] ?? "").trim() && value) {
		lines[index] = `${key}=${quote(value)}`;
		filled.push(key);
	}
}

const content = lines.join("\n").replace(/\n*$/, "\n");
const candidate = ENV_PATH + ".migrating";

await Bun.write(candidate, content);

// Read the candidate back the way the bot will, in a clean environment.
const check = Bun.spawnSync(
	[
		process.execPath,
		"--env-file=" + candidate,
		"-e",
		`process.stdout.write(JSON.stringify(Object.fromEntries(${JSON.stringify(
			Object.keys(wanted)
		)}.map((k) => [k, process.env[k] ?? ""]))))`
	],
	{ env: { PATH: process.env.PATH ?? "" }, cwd: path.dirname(candidate) }
);

const reread = JSON.parse(check.stdout.toString() || "{}") as Record<
	string,
	string
>;
const mismatched = [...added, ...filled].filter(
	(key) => reread[key] !== wanted[key]
);

if (check.exitCode !== 0 || mismatched.length) {
	logger.err(
		`The new .env does not read back identically (${mismatched.join(", ") || "bun failed"}): left in .env.migrating, config.ts kept.`
	);
	process.exit(1);
}

// The migrated values must also build a valid configuration.
configFromEnv(reread);

await rename(candidate, ENV_PATH);
await rename(LEGACY_CONFIG_PATH, LEGACY_CONFIG_PATH + ".migrated");

logger.log(
	`Migrated config.ts into .env: ${added.length} added, ${filled.length} filled, ${Object.keys(wanted).length - added.length - filled.length} kept from .env. src/files/config.ts renamed to config.ts.migrated.`
);

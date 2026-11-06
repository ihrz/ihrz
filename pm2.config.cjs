/*
 * pm2 entry point for iHorizon (`pm2 start pm2.config.cjs`).
 *
 * This file is both the pm2 config and the launcher pm2 runs:
 * - loaded by the pm2 CLI, it only exports the app config below;
 * - run by pm2 as the app (IHORIZON_PM2_LAUNCH=1), it prepares and starts
 *   the bot, on every start and every automatic restart:
 *     1. stop the bot processes left over from a previous run of this
 *        checkout (scripts/killPhantoms.cjs);
 *     2. a project-local Bun in ./.bun (gitignored): downloaded when
 *        missing, `bun upgrade`d otherwise;
 *     3. `git pull` to the latest commit of the checked-out branch;
 *     4. `bun install --production` (new dependencies of the pull);
 *     5. `bun src/index.ts` with that Bun, signals forwarded.
 * A failed cleanup, upgrade, pull or install is logged and the bot starts with
 * what is already there.
 */

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = __dirname;
const BUN_DIR = path.join(ROOT, ".bun");
const BUN = path.join(BUN_DIR, "bin", process.platform === "win32" ? "bun.exe" : "bun");

const config = {
	name: "iHorizon",
	cwd: ROOT,
	script: __filename,
	interpreter: "node",
	env: { IHORIZON_PM2_LAUNCH: "1" },
	autorestart: true,
	max_restarts: 10,
	restart_delay: 5000,
	kill_timeout: 15000,
	time: true
};

module.exports = config;

function log(message) {
	process.stdout.write(`[pm2-launch] ${message}\n`);
}

function run(file, args, options = {}) {
	execFileSync(file, args, { cwd: ROOT, stdio: "inherit", ...options });
}

function bunAsset() {
	const platform = { linux: "linux", darwin: "darwin" }[process.platform];
	const arch = { x64: "x64", arm64: "aarch64" }[process.arch];
	if (!platform || !arch) {
		throw new Error(`no Bun build for ${process.platform}/${process.arch}`);
	}
	return `bun-${platform}-${arch}`;
}

function downloadBun() {
	const asset = bunAsset();
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ihorizon-bun-"));
	const zip = path.join(tmp, `${asset}.zip`);
	try {
		log(`downloading Bun (${asset}) into ${BUN_DIR}`);
		run("curl", [
			"-fsSL",
			"--retry",
			"3",
			"-o",
			zip,
			`https://github.com/oven-sh/bun/releases/latest/download/${asset}.zip`
		]);
		run("unzip", ["-oq", zip, "-d", tmp]);
		fs.mkdirSync(path.dirname(BUN), { recursive: true });
		fs.copyFileSync(path.join(tmp, asset, "bun"), BUN);
		fs.chmodSync(BUN, 0o755);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

function step(label, action) {
	try {
		action();
	} catch (error) {
		log(`${label} failed, continuing: ${error.message}`);
	}
}

function launch() {
	step("phantom cleanup", () => {
		const { killPhantoms } = require("./scripts/killPhantoms.cjs");
		const stopped = killPhantoms(ROOT);
		if (stopped.length > 0) {
			log(`stopped ${stopped.length} leftover bot process(es): ${stopped.join(", ")}`);
		}
	});

	if (fs.existsSync(BUN)) {
		step("bun upgrade", () => run(BUN, ["upgrade"], { timeout: 120_000 }));
	} else {
		// Without a Bun there is nothing to start: let this one throw.
		downloadBun();
	}
	run(BUN, ["--version"]);

	step("git pull", () => run("git", ["pull"], { timeout: 120_000 }));
	step("bun install", () =>
		run(BUN, ["install", "--production"], { timeout: 300_000 })
	);

	const bot = spawn(BUN, ["src/index.ts"], {
		cwd: ROOT,
		stdio: "inherit",
		env: { ...process.env, PATH: `${path.dirname(BUN)}${path.delimiter}${process.env.PATH}` }
	});
	for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
		process.on(signal, () => bot.kill(signal));
	}
	bot.on("exit", (code, signal) => {
		process.exit(code ?? (signal ? 1 : 0));
	});
}

if (process.env.IHORIZON_PM2_LAUNCH === "1") launch();

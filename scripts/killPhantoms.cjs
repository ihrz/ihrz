/*
 * Stops bot processes left over from a previous run of this checkout.
 *
 * The shards are children of src/index.ts, which does not stop them when it
 * dies: a pm2 restart can leave them running, and each copy of the bot then
 * answers every command. Used by pm2.config.cjs before it starts the bot.
 *
 * A process only matches when it is a Bun running one of the bot entry points
 * from this exact checkout, so other bots on the same machine are left alone.
 * Reads /proc: on systems without it, nothing is stopped.
 */

const fs = require("node:fs");
const path = require("node:path");

const TERM_WAIT_MS = 5000;
const POLL_INTERVAL_MS = 200;

const ENTRY_POINTS = ["src/index.ts", "src/core/bot.ts"];

function isBotProcess(argv, cwd, root) {
	if (path.basename(argv[0] ?? "") !== "bun") return false;

	const args = argv.slice(1).filter((arg) => !arg.startsWith("-"));
	const script = args[0] === "run" ? args[1] : args[0];

	if (!script) return false;

	const resolved = path.resolve(cwd, script);

	return ENTRY_POINTS.some((entry) => resolved === path.join(root, entry));
}

function findBotProcesses(root) {
	const realRoot = fs.realpathSync(root);
	const pids = [];

	for (const entry of fs.readdirSync("/proc")) {
		if (!/^\d+$/.test(entry)) continue;

		const pid = Number(entry);

		if (pid === process.pid) continue;

		try {
			const argv = fs
				.readFileSync(`/proc/${pid}/cmdline`, "utf8")
				.split("\0")
				.filter(Boolean);
			const cwd = fs.readlinkSync(`/proc/${pid}/cwd`);

			if (cwd === realRoot && isBotProcess(argv, cwd, realRoot)) {
				pids.push(pid);
			}
		} catch {
			// Gone in the meantime, or owned by another user.
		}
	}

	return pids;
}

function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function signalAll(pids, signal) {
	for (const pid of pids) {
		try {
			process.kill(pid, signal);
		} catch {
			// Already gone.
		}
	}
}

// Returns the pids that had to be stopped. A process stays listed by
// findBotProcesses until it is really gone: a zombie has no cmdline.
function killPhantoms(root, { termWaitMs = TERM_WAIT_MS } = {}) {
	if (!fs.existsSync("/proc/self/cmdline")) return [];

	const pids = findBotProcesses(root);

	if (pids.length === 0) return [];

	signalAll(pids, "SIGTERM");

	const deadline = Date.now() + termWaitMs;

	while (Date.now() < deadline) {
		if (findBotProcesses(root).length === 0) return pids;

		sleep(POLL_INTERVAL_MS);
	}

	signalAll(findBotProcesses(root), "SIGKILL");

	return pids;
}

module.exports = { findBotProcesses, isBotProcess, killPhantoms };

module.exports = {
	name: "iHorizon",
	cwd: __dirname,
	script: `${process.env.HOME}/.bun/bin/bun`,
	args: "src/index.ts",
	interpreter: "none",
	autorestart: true,
	max_restarts: 10,
	restart_delay: 5000,
	time: true
};

module.exports = {
	name: "iHorizon",
	script: "bun .",
	interpreter: "bun", // Bun interpreter
	env: {
		PATH: `${process.env.HOME
			}/.bun/bin:${process.env.PATH
			}`, // Add "~/.bun/bin/bun" to PATH
	},
};
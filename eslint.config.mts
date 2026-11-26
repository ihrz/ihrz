// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module"
			}
		},
		plugins: {
			"unused-imports": unusedImports
		},
		rules: {
			"unused-imports/no-unused-imports": "error",
			// No instanceof anywhere: a second copy of a package (discord.js…) or a test double fails it while
			// having the right shape. Use the shape checks instead.
			"no-restricted-syntax": [
				"error",
				{
					selector: "BinaryExpression[operator='instanceof']",
					message:
						"instanceof is not used in iHorizon: hybrid sources → isSlash / isMessage / authorOf + options() (core/functions/method/source.ts, args.ts); interactions → interaction.isButton() etc.; channels → isChannelOfType / isGuildTextChannel / channel.isTextBased(); errors, dates, maps, members, roles, builders → core/functions/typeGuards.ts"
				}
			],
			"unused-imports/no-unused-vars": [
				"warn",
				{
					vars: "all",
					varsIgnorePattern: "^_",
					args: "after-used",
					argsIgnorePattern: "^_"
				}
			]
		}
	},
	{
		// Commands and events reach the core's helpers through client.func (loaded by the core), never by
		// importing them: client.func.method.isSlash / authorOf…, client.func.typeGuards.isError…
		files: ["src/Interaction/**/*.ts", "src/Events/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: [
								"**/core/functions/method/source.js",
								"**/core/functions/typeGuards.js"
							],
							message:
								"Use client.func.method.* (isSlash, isMessage, isInteraction, authorOf) or client.func.typeGuards.* instead of importing them."
						}
					]
				}
			]
		}
	}
];

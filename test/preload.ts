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

/**
 * Preload for `bun test`.
 *
 * The extractors use the global `logger` (set up by the bot bootstrap at
 * runtime). Tests run outside the bot, so a no-op stand-in is registered
 * once here, before any extractor module is imported.
 *
 * Importing a module that pulls the real logger (src/core/logger.ts sets
 * `global.logger` when it loads) must not replace the stand-in for the
 * other test files, so the global ignores later assignments.
 */

const loggerStandIn = {
	log: () => {},
	warn: () => {},
	err: () => {},
	debug: () => {}
};

Object.defineProperty(globalThis, "logger", {
	configurable: true,
	get: () => loggerStandIn,
	set: () => {}
});

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
 * Native music metadata extractors, embedded in the codebase instead of
 * the former kisastractors GitHub packages:
 *
 *    src/core/extractors/spotify/       <- spotify-metadata
 *    src/core/extractors/apple-music/   <- apple-music-metadata
 *    src/core/extractors/amazon-music/  <- amazon-music-metadata
 *    src/core/extractors/tidal/         <- tidal-metadata
 *
 * Shared rules and types live in src/core/extractors/common/.
 */

export { default as appleMusic } from "./apple-music/index.js";
export { default as amazonMusic } from "./amazon-music/index.js";
export { default as tidalMusic } from "./tidal/index.js";
export * as spotify from "./spotify/index.js";

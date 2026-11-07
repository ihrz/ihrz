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

// Regenerates src/exports (see src/core/modules/exportsManifest.ts).
// `--check` only reports the stale files and exits 1 when there are some.

import logger from "../src/core/logger.ts";
import {
	checkExports,
	writeExports
} from "../src/core/modules/exportsManifest.ts";

if (process.argv.includes("--check")) {
	const stale = await checkExports();

	if (stale.length) {
		logger.err(
			`Stale exports: ${stale.join(", ")}. Run \`bun run gen:exports\`.`
		);
		process.exit(1);
	}

	logger.log("Exports are up to date.");
} else {
	const written = await writeExports();

	logger.log(
		written.length
			? `Rewrote exports: ${written.join(", ")}`
			: "Exports are up to date."
	);
}

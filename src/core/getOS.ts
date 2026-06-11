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

import os from "node:os";

export interface OS {
	emojis: string;
	name: string;
}

export function getOS(): OS | null {
	const emojis = client.iHorizon_Emojis;

	switch (process.platform) {
		case "linux":
			return {
				emojis: emojis.Tux,
				name: "Linux"
			};

		case "darwin":
			return {
				emojis: emojis.Finder,
				name: "macOS"
			};

		case "win32": {
			const release = os.release();

			if (release.startsWith("10.0.")) {
				const build = Number(release.split(".")[2]);

				return {
					emojis: build >= 22000 ? emojis.Win11 : emojis.Win10,
					name: build >= 22000 ? "Windows 11" : "Windows 10"
				};
			}

			return {
				emojis: client.iHorizon_Emojis.Win10,
				name: "Windows"
			};
		}

		default:
			return null;
	}
}

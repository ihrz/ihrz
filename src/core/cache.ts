/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import path from 'node:path';
import fs from "node:fs";

const cache_storage_path = path.join(process.cwd(), "src", "files", ".ihrz-cache");
const format = { format: "2025-07" };

export var cache_storage_data: any = {};
export const cache_storage_update = () => {
	fs.writeFileSync(cache_storage_path, JSON.stringify(cache_storage_data, null, 4));
};

// if not cache founded, let create them
if (!fs.existsSync(cache_storage_path)) {
	fs.writeFileSync(cache_storage_path, JSON.stringify(format, null, 4));
} else {
	cache_storage_data = JSON.parse(fs.readFileSync(cache_storage_path, 'utf-8'));

	if (cache_storage_data?.["format"] !== "2025-07") {
		cache_storage_data = format;
	};
	cache_storage_update()
}
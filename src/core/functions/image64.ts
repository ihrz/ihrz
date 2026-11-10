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

import { axios, AxiosResponse } from "./axios.js";
import { isPublicImageUrl } from "../svg/remoteImage.js";

/** Whether `url` is a public http(s) URL serving an image (no internal hosts). */
export async function isImageUrl(url: string): Promise<boolean> {
	return isPublicImageUrl(url).catch(() => false);
}

export async function image64(arg: string): Promise<Buffer | undefined> {
	try {
		const response: AxiosResponse<ArrayBuffer> = await axios.get(arg, {
			responseType: "arrayBuffer"
		});

		return Buffer.from(response.data);
	} catch (error) {
		return undefined;
	}
}

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

import config from "../../files/config.ts";
import { axios } from "./axios.ts";

export default async function html2Png(
	code: string,
	options: {
		width?: number;
		height?: number;
		scaleSize?: number;
		elementSelector?: string;
		omitBackground: boolean;
		selectElement: boolean;
	} = {
			width: 1280,
			height: 800,
			scaleSize: 1,
			elementSelector: '.container',
			omitBackground: false,
			selectElement: false,
		}
): Promise<Buffer> {
	try {
		let res = await axios.post(`https://gateway.ihorizon.org/api/ownihrz/v1/png`, {
			adminKey: config.api.apiToken,
			html: code,
			body: options,
		}, {
			responseType: "arrayBuffer"
		});

		return Buffer.from(res.data || [0]);
	} catch (error) {
		throw error;
	}
}
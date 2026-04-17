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

export interface Html2PngOptions {
	width?: number;
	height?: number;
	scaleSize?: number;
	elementSelector?: string;
	omitBackground: boolean;
	selectElement: boolean;
}

export const DEFAULT_HTML2PNG_OPTIONS: Html2PngOptions = {
	width: 1280,
	height: 800,
	scaleSize: 1,
	elementSelector: '.container',
	omitBackground: false,
	selectElement: false,
};

export const HTML2PNG_IPC_REQUEST = 'ihrz:html2png:request';
export const HTML2PNG_IPC_RESPONSE = 'ihrz:html2png:response';

export interface Html2PngRequestMessage {
	type: typeof HTML2PNG_IPC_REQUEST;
	requestId: string;
	code: string;
	options: Html2PngOptions;
}

export interface Html2PngResponseMessage {
	type: typeof HTML2PNG_IPC_RESPONSE;
	requestId: string;
	imageBase64?: string;
	error?: {
		message: string;
		stack?: string;
	};
}

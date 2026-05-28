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

import { Assets } from "../../../types/assets.js";

export enum GatewayMethod {
	GenerateOauthLink = 0,
	CreateAuthRestoreGuild = 1,
	ForceJoinAuthRestore = 2,
	AddSecurityCodeAmount = 3,
	ChangeRole = 4,
	UserInfo = 5,
	ServerBackup = 6,
	SecureWebhook = 7,
	CreateCustomVanity = 8,
	ImageGeneration = 9
}

export function assetsFinder(body: Assets, type: string): string {
	return `https://gitlab.com/ihrz/assets/-/raw/main/${type}/${Math.floor(Math.random() * body[type])}.gif?ref_type=heads`;
}

export function HorizonGateway(gateway_method: GatewayMethod): string {
	let data = client.config.api.HorizonGateway;

	if (!data) throw "Error: HorizonGateway empty in the configurations files";

	switch (gateway_method) {
		case 0:
			data += "/api/ihorizon/v1/oauth2";
			break;
		case 1:
			data += "/api/ihorizon/v1/create-oauth2";
			break;
		case 2:
			data += "/api/ihorizon/v1/forcejoin";
			break;
		case 3:
			data += "/api/ihorizon/v1/securityCodeUpdate";
			break;
		case 4:
			data += "/api/ihorizon/v1/role";
			break;
		case 5:
			data += "/api/ihorizon/v1/userinfo";
			break;
		case 6:
			data += "/api/ihorizon/v1/serverBackup";
			break;
		case 7:
			data += "/api/v1/securewebhook/manage";
			break;
		case 8:
			data += "/api/ihorizon/v1/vanity-creation";
			break;
		case 9:
			data += "/api/ihorizon/v1/image";
			break;
	}

	return data;
}

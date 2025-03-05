/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import * as apiUrlParser from "./apiUrlParser.js";
import { axios } from "./axios.js";

export const Oauth2_Link = 'https://discord.com/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&state={guild_id}'

// {client_id}: id of the app/bot, 
// {redirect_uri}: URL OF HORIZON GATEWAY, 
// {guild_id}: id of the verified guild, 

export interface GuildAuthRestore {
	config: {
		roleId: string;
		securityCode: string;
		author: oauth2Author;
		createDate: number;
		securityCodeUsed: number;
	},
	members: string[];
}

export type SavedMembersAuthRestore = oauth2Member[];

export interface oauth2Member {
	token: string;
	id: string;
	username: string;
	globalName: string;
	registerTimestamp: number;
	locale: string;
}

export interface oauth2Author {
	id: string;
	username: string;
}

export interface AuthRestore_EntryType {
	guildId: string;
	author?: oauth2Author
	clientId?: string;
	apiToken?: string;
	roleId?: string;
}

export interface AuthRestore_ForceJoin_EntryType {
	guildId: string;
	apiToken: string;
	secretCode: string;
	targetGuildId: string;
	membersToForceJoin: string[];
}

export interface AuthRestore_KeyUpdate_EntryType {
	guildId: string;
	apiToken: string;
	secretCode: string;
}

export interface AuthRestore_RoleUpdate_EntryType {
	guildId: string;
	apiToken: string;
	roleId: string;
}

export interface AuthRestore_ForceJoin_ResponseType {
	status: "OK" | "ERR";
	message: string;
}

export interface AuthRestore_ResponseType {
	status: "OK" | "ERR";
	message: string;
	secretCode?: string;
}

export function createAuthRestoreLink(data: AuthRestore_EntryType): string {
	return Oauth2_Link
		.replace("{client_id}", data.clientId!)
		.replace("{guild_id}", data.guildId)
		.replace("{redirect_uri}", apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.GenerateOauthLink))
		.replace("{scope}", "identify+guilds+guilds.join")
}

export async function createAuthRestore(data: AuthRestore_EntryType): Promise<AuthRestore_ResponseType> {
	return (await axios.post(apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.CreateAuthRestoreGuild),
		data,
		{ headers: { 'Accept': 'application/json' } }
	)).data || {}
}

export function getGuildDataPerSecretCode(data: { id: string; value: any }[], secretCode: string): { id: string, data: GuildAuthRestore } | null {
	for (let index in data) {
		const entry = data[index];

		if (entry.value && entry.value.config && entry.value.config.securityCode === secretCode) {
			return { id: entry.id, data: entry.value };
		}
	}

	return null;
}

export async function forceJoinAuthRestore(data: AuthRestore_ForceJoin_EntryType): Promise<AuthRestore_ForceJoin_ResponseType> {
	return (await axios.post(apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.ForceJoinAuthRestore),
		data,
		{ headers: { 'Accept': 'application/json' } }
	)).data || {}
}

export async function securityCodeUpdate(data: AuthRestore_KeyUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType> {
	return (await axios.post(apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.AddSecurityCodeAmount),
		data,
		{ headers: { 'Accept': 'application/json' } }
	)).data || {}
}

export async function changeRoleAuthRestore(data: AuthRestore_RoleUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType> {
	return (await axios.post(apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.ChangeRole),
		data,
		{ headers: { 'Accept': 'application/json' } }
	)).data || {}
}